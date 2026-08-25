/**
 * Demo seed: eco traveler, guide (2 circuits + 2 offers), provider (2 circuits + 2 offers),
 * plus one guide offer in collaboration with the provider.
 *
 * Login (all): password Demo123!
 *   traveler@demo.local  — eco_traveler
 *   guide@demo.local     — guide
 *   provider@demo.local  — provider
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { join } from 'path';

import { User } from '../../users/entities/user.entity';
import { EcoTraveler } from '../../eco-traveler/entities/eco-traveler.entity';
import { Guide } from '../../guide/entities/guide.entity';
import { Provider } from '../../provider/entities/provider.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { Circuit } from '../../circuit/entities/circuit.entity';
import { Offer } from '../../offer/entities/offer.entity';
import { OfferCollaboration } from '../../offer/entities/offer-collaboration.entity';
import { Role } from '../../common/enums/roles.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuthMethod } from '../../common/enums/auth-method.enum';

config({ path: join(__dirname, '../../../.env.dev') });
config({ path: join(__dirname, '../../../.env') });

const PASSWORD = 'Demo123!';

const EMAILS = {
  traveler: 'traveler@demo.local',
  guide: 'guide@demo.local',
  provider: 'provider@demo.local',
} as const;

async function seed() {
  if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
    console.error('❌ Missing DB config. Ensure .env.dev exists with DB_* vars.');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    entities: [
      User,
      EcoTraveler,
      Guide,
      Provider,
      Organization,
      Circuit,
      Offer,
      OfferCollaboration,
    ],
    synchronize: false,
  });

  await ds.initialize();
  console.log('✅ Connected to Postgres');

  const users = ds.getRepository(User);
  const existing = await users.findOne({ where: { email: EMAILS.guide } });
  if (existing) {
    console.log('ℹ️  Demo users already exist — skipping seed.');
    console.log('   Login with Demo123! : traveler@demo.local | guide@demo.local | provider@demo.local');
    await ds.destroy();
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  // ── Users ───────────────────────────────────────────────────────────────
  const travelerUser = await users.save(
    users.create({
      email: EMAILS.traveler,
      password: hash,
      auth_method: AuthMethod.EMAIL,
      role: Role.ECO_TRAVELER,
      status: UserStatus.ACTIVE,
      email_verified_at: now,
    }),
  );

  const guideUser = await users.save(
    users.create({
      email: EMAILS.guide,
      password: hash,
      auth_method: AuthMethod.EMAIL,
      role: Role.GUIDE,
      status: UserStatus.ACTIVE,
      email_verified_at: now,
    }),
  );

  const providerUser = await users.save(
    users.create({
      email: EMAILS.provider,
      password: hash,
      auth_method: AuthMethod.EMAIL,
      role: Role.PROVIDER,
      status: UserStatus.ACTIVE,
      email_verified_at: now,
    }),
  );

  console.log('👤 Users created');

  // ── Profiles ────────────────────────────────────────────────────────────
  await ds.getRepository(EcoTraveler).save({
    user_id: travelerUser.id,
    full_name: 'Amira Ben Salem',
    bio: 'Voyageuse engagée, passionnée par les expériences locales et durables.',
    country: 'Tunisie',
    language: 'fr',
    traveler_types: ['aventure', 'culturel'],
    motivations: ['nature', 'communautes'],
    landscapes: ['montagne', 'mer', 'desert'],
    travel_styles: ['slow_travel'],
    sustainability_goals: ['empreinte_carbone', 'economie_locale'],
    interests: ['randonnee', 'gastronomie', 'artisanat'],
    profile_completion: 90,
    is_onboarded: true,
    sustainability_score: 72,
    score_questionnaire: 75,
  });

  await ds.getRepository(Guide).save({
    user_id: guideUser.id,
    full_name: 'Youssef Mansouri',
    guide_type: 'professionnel',
    bio: 'Guide local spécialisé en randonnée et patrimoine du Nord-Ouest tunisien.',
    country: 'Tunisie',
    language: 'fr',
    zone: 'Nord-Ouest',
    specialties: ['randonnee', 'patrimoine', 'ornithologie'],
    domaines: ['nature', 'culture'],
    expertises: ['trek', 'villages_berberes'],
    languages_spoken: ['fr', 'ar', 'en'],
    telephone: '+216 98 000 111',
    ville_residence: 'Aïn Draham',
    years_experience: 8,
    zones_couvertes: ['Jendouba', 'Kef', 'Beja'],
    villes_couvertes: ['Aïn Draham', 'Tabarka', 'El Kef'],
    publics_accueillis: ['familles', 'groupes', 'solo'],
    status: 'active',
    profile_completion: 95,
    is_onboarded: true,
    sustainability_score: 80,
  });

  await ds.getRepository(Provider).save({
    user_id: providerUser.id,
    full_name: 'Leila Trabelsi',
    provider_type: 'ecolodge',
    organization: 'Écolodge Les Chênes',
    bio: 'Écolodge familial au cœur de la forêt de chênes-lièges.',
    personal_bio: 'Hôtesse engagée pour un tourisme responsable.',
    country: 'Tunisie',
    language: 'fr',
    region: 'Jendouba',
    address: 'Forêt d\'Aïn Draham',
    zone: 'Nord-Ouest',
    phone: '+216 98 000 222',
    languages_spoken: ['fr', 'ar', 'en'],
    years_experience: 12,
    activity_types: ['hebergement', 'restauration'],
    specialties: ['ecolodge', 'table_hote'],
    eco_labels: ['clef_verte'],
    status: 'active',
    sustainability_score: 85,
  });

  const org = await ds.getRepository(Organization).save({
    provider_id: providerUser.id,
    name: 'Écolodge Les Chênes',
    provider_type: 'ecolodge',
    bio: 'Hébergement écologique et table d\'hôtes en forêt.',
    region: 'Jendouba',
    address: 'Forêt d\'Aïn Draham',
    zone: 'Nord-Ouest',
    country: 'Tunisie',
    phone: '+216 98 000 222',
    email: EMAILS.provider,
    eco_labels: ['clef_verte'],
    status: 'active',
    sustainability_score: 85,
  });

  console.log('📋 Profiles + organization created');

  // ── Circuits (2 guide + 2 provider) ─────────────────────────────────────
  const circuits = ds.getRepository(Circuit);

  await circuits.save([
    {
      provider_id: guideUser.id,
      owner_type: 'guide',
      title: 'Trek des chênes-lièges — 2 jours',
      description:
        'Randonnée accompagnée entre Aïn Draham et Tabarka, villages et forêts.',
      nb_jours: 2,
      circuit_mode: 'single',
      price: 95,
      capacity: 12,
      max_group_size: 8,
      confirmation_mode: 'manual',
      deposit_percentage: 30,
      availability: {
        type: 'specific',
        dates: ['2026-09-15', '2026-09-22', '2026-10-06', '2026-10-20'],
      },
      etapes: [
        {
          id: 'e1',
          jour: 1,
          titre: 'Départ Aïn Draham',
          description: 'Montée en forêt et pause village',
          prix: 50,
        },
        {
          id: 'e2',
          jour: 2,
          titre: 'Descente vers Tabarka',
          description: 'Point de vue mer et retour',
          prix: 45,
        },
      ],
      tags: ['randonnee', 'foret', 'nord-ouest'],
      status: 'approved',
      sustainability_score: 78,
    },
    {
      provider_id: guideUser.id,
      owner_type: 'guide',
      title: 'Circuit patrimoine berbère — 3 jours',
      description:
        'Découverte des villages, artisanat et traditions du Kef et environs.',
      nb_jours: 3,
      circuit_mode: 'variant',
      price: 180,
      capacity: 10,
      max_group_size: 6,
      confirmation_mode: 'manual',
      deposit_percentage: 25,
      availability: {
        type: 'recurring',
        start_date: '2026-06-01',
        end_date: '2026-11-30',
        days_of_week: ['4', '5'],
      },
      etapes: [
        { id: 'e1', jour: 1, titre: 'El Kef médina', description: 'Visite guidée', prix: 60, optional: false },
        { id: 'e2', jour: 2, titre: 'Villages de montagne', description: 'Rencontres locales', prix: 70, optional: true },
        { id: 'e3', jour: 3, titre: 'Artisanat', description: 'Atelier poterie', prix: 50, optional: true },
      ],
      tags: ['culture', 'patrimoine'],
      status: 'approved',
      sustainability_score: 82,
    },
    {
      provider_id: providerUser.id,
      owner_type: 'provider',
      title: 'Séjour nature Écolodge — 2 nuits',
      description:
        'Circuit soft autour de l\'écolodge : sentiers, observation oiseaux, table d\'hôtes.',
      nb_jours: 3,
      circuit_mode: 'package',
      price: 220,
      capacity: 8,
      max_group_size: 4,
      confirmation_mode: 'instant',
      deposit_percentage: 40,
      availability: {
        type: 'specific',
        dates: ['2026-08-01', '2026-08-15', '2026-09-01', '2026-09-15'],
      },
      etapes: [
        { id: 'e1', jour: 1, titre: 'Accueil & forêt', description: 'Installation et balade', prix: 75 },
        { id: 'e2', jour: 2, titre: 'Observation nature', description: 'Sortie matinale', prix: 80 },
        { id: 'e3', jour: 3, titre: 'Départ', description: 'Petit-déjeuner et checkout', prix: 65 },
      ],
      hebergement: { type: 'ecolodge', name: 'Écolodge Les Chênes', inclus: true },
      tags: ['hebergement', 'nature'],
      status: 'approved',
      sustainability_score: 88,
    },
    {
      provider_id: providerUser.id,
      owner_type: 'provider',
      title: 'Immersion gastronomique locale — 1 jour',
      description:
        'Marché local, cuisine avec produits du terroir, déjeuner à l\'écolodge.',
      nb_jours: 1,
      circuit_mode: 'single',
      price: 65,
      capacity: 15,
      max_group_size: 10,
      confirmation_mode: 'manual',
      availability: {
        type: 'specific',
        dates: ['2026-07-12', '2026-07-26', '2026-08-09', '2026-08-23'],
      },
      etapes: [
        {
          id: 'e1',
          jour: 1,
          titre: 'Marché & cuisine',
          description: 'Atelier culinaire et dégustation',
          prix: 65,
        },
      ],
      tags: ['gastronomie', 'local'],
      status: 'approved',
      sustainability_score: 80,
    },
  ]);

  console.log('🗺️  4 circuits created (2 guide + 2 provider)');

  // ── Offers (2 guide + 2 provider + 1 collab) ────────────────────────────
  const offers = ds.getRepository(Offer);

  const guideOffer1 = await offers.save(
    offers.create({
      author_id: guideUser.id,
      author_type: 'guide',
      title: "Randonnée demi-journée forêt d'Aïn Draham",
      description: 'Sortie guidée de 4h en forêt de chênes-lièges.',
      price: 45,
      duration: '4h',
      offer_type: 'guide',
      offer_subtype: 'randonnee',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_person',
      capacity: 8,
      min_group_size: 2,
      max_group_size: 8,
      region: 'Jendouba',
      meeting_point: 'Place centrale Aïn Draham',
      inclusions: 'Guide, pauses, eau',
      tags: ['randonnee', 'nature'],
      status: 'approved',
      sustainability_score: 75,
      availability_mode: 'period',
      availability_start: new Date('2026-09-01'),
      availability_end: new Date('2026-11-30'),
      details: {
        difficulty: 'facile',
        language: ['fr', 'ar'],
        disponibilite: {
          type: 'range',
          start_date: '2026-09-01',
          end_date: '2026-11-30',
        },
      },
    }),
  );

  const guideOffer2 = await offers.save(
    offers.create({
      author_id: guideUser.id,
      author_type: 'guide',
      title: 'Visite guidée patrimoine El Kef',
      description:
        'Découverte de la médina et des sites historiques avec un guide local.',
      price: 35,
      duration: '3h',
      offer_type: 'guide',
      offer_subtype: 'visite_culturelle',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_person',
      capacity: 12,
      region: 'Le Kef',
      meeting_point: 'Porte de la médina',
      tags: ['culture', 'patrimoine'],
      status: 'approved',
      sustainability_score: 70,
      availability_mode: 'period',
      availability_start: new Date('2026-09-15'),
      availability_end: new Date('2026-10-20'),
      details: {
        themes: ['histoire', 'architecture'],
        disponibilite: {
          type: 'specific',
          start_date: '2026-09-15',
          end_date: '2026-10-20',
          dates: ['2026-09-15', '2026-09-22', '2026-10-06', '2026-10-20'],
        },
      },
    }),
  );

  const providerOffer1 = await offers.save(
    offers.create({
      author_id: providerUser.id,
      author_type: 'provider',
      organization_id: org.id,
      title: 'Nuitée Écolodge Les Chênes',
      description: 'Chambre éco avec petit-déjeuner bio local.',
      price: 120,
      duration: '1 nuit',
      offer_type: 'hebergement',
      offer_subtype: 'ecolodge',
      fulfillment_mode: 'calendar_stock',
      confirmation_mode: 'manual',
      price_type: 'per_night',
      capacity: 4,
      region: 'Jendouba',
      meeting_point: 'Écolodge Les Chênes',
      tags: ['hebergement', 'eco'],
      status: 'approved',
      sustainability_score: 90,
      availability_mode: 'period',
      availability_start: new Date('2026-10-01'),
      availability_end: new Date('2027-03-31'),
      details: {
        pension: 'petit_dejeuner',
        eco: true,
        disponibilite: {
          type: 'range',
          start_date: '2026-10-01',
          end_date: '2027-03-31',
        },
      },
    }),
  );

  const providerOffer2 = await offers.save(
    offers.create({
      author_id: providerUser.id,
      author_type: 'provider',
      organization_id: org.id,
      title: "Table d'hôtes produits du terroir",
      description: 'Dîner 3 services à base de produits locaux et de saison.',
      price: 40,
      duration: '2h',
      offer_type: 'restauration',
      offer_subtype: 'table_hote',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_person',
      capacity: 20,
      region: 'Jendouba',
      tags: ['gastronomie', 'local'],
      status: 'approved',
      sustainability_score: 85,
      availability_mode: 'period',
      availability_start: new Date('2026-09-01'),
      availability_end: new Date('2026-12-20'),
      details: {
        menu: 'terroir',
        vegetarian_options: true,
        disponibilite: {
          type: 'recurring',
          start_date: '2026-09-01',
          end_date: '2026-12-20',
          days_of_week: ['4', '5'],
        },
      },
    }),
  );

  const collabOffer = await offers.save(
    offers.create({
      author_id: guideUser.id,
      author_type: 'guide',
      title: 'Week-end forêt : trek + nuitée écolodge',
      description:
        "Offre collaborative : randonnée guidée par Youssef + hébergement à l'Écolodge Les Chênes.",
      price: 190,
      duration: '2 jours / 1 nuit',
      offer_type: 'guide',
      offer_subtype: 'package',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_person',
      capacity: 6,
      min_group_size: 2,
      max_group_size: 6,
      region: 'Jendouba',
      meeting_point: 'Écolodge Les Chênes',
      inclusions: 'Guide, 1 nuitée, petit-déjeuner, pique-nique jour 1',
      tags: ['package', 'randonnee', 'hebergement', 'collaboration'],
      status: 'approved',
      sustainability_score: 88,
      availability_mode: 'period',
      availability_start: new Date('2026-10-10'),
      availability_end: new Date('2026-11-15'),
      details: {
        package: true,
        hebergement_types: ['ecolodge'],
        disponibilite: {
          type: 'specific',
          start_date: '2026-10-10',
          end_date: '2026-11-15',
          dates: ['2026-10-10', '2026-10-24', '2026-11-07', '2026-11-14'],
        },
        collaborators: [
          {
            user_id: providerUser.id,
            user_type: 'provider',
            name: 'Leila Trabelsi — Écolodge Les Chênes',
            section: 'hebergement',
            status: 'completed',
          },
        ],
      },
    }),
  );

  await ds.getRepository(OfferCollaboration).save({
    offer_id: collabOffer.id,
    guide_id: guideUser.id,
    invited_user_id: providerUser.id,
    invited_user_type: 'provider',
    invited_user_name: 'Leila Trabelsi — Écolodge Les Chênes',
    section: 'hebergement',
    status: 'completed',
    message: 'Merci de fournir l\'hébergement pour le week-end trek.',
    contribution_data: {
      hebergement_type: 'ecolodge',
      nights: 1,
      meal: 'petit_dejeuner',
      notes: 'Chambres twin / double selon dispo',
    },
    section_context: {
      category: 'hebergement',
      subtypes: ['ecolodge'],
    },
  });

  console.log('🎁 Offers created: 2 guide + 2 provider + 1 collab');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(' Demo accounts (password: Demo123!)');
  console.log('───────────────────────────────────────────────────');
  console.log(`  Eco traveler : ${EMAILS.traveler}`);
  console.log(`  Guide        : ${EMAILS.guide}`);
  console.log(`  Provider     : ${EMAILS.provider}`);
  console.log('───────────────────────────────────────────────────');
  console.log(`  Guide offers     : ${guideOffer1.title}`);
  console.log(`                     ${guideOffer2.title}`);
  console.log(`  Provider offers  : ${providerOffer1.title}`);
  console.log(`                     ${providerOffer2.title}`);
  console.log(`  Collab offer     : ${collabOffer.title}`);
  console.log('═══════════════════════════════════════════════════');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
