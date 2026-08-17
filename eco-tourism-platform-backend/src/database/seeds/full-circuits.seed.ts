/**
 * Full demo circuits — booking fields, availability, bookable_options, collabs.
 * Upsert by title. Requires demo users (npm run seed:demo).
 *
 * Login: guide@demo.local | provider@demo.local | traveler@demo.local — Demo123!
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../../users/entities/user.entity';
import { Guide } from '../../guide/entities/guide.entity';
import { Provider } from '../../provider/entities/provider.entity';
import { Circuit } from '../../circuit/entities/circuit.entity';
import { CircuitCollaboration } from '../../circuit/entities/circuit-collaboration.entity';
import { buildBookableOptions } from '../../circuit/circuit-pricing.util';

config({ path: join(__dirname, '../../../.env.dev') });
config({ path: join(__dirname, '../../../.env') });

const IMG = {
  forest:
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
  trek:
    'https://images.unsplash.com/photo-1551632811-561732d1e67f?w=1200&q=80',
  heritage:
    'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1200&q=80',
  lodge:
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
  food:
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
  birds:
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&q=80',
  kayak:
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
  yoga:
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
  coast:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
};

type Dispo =
  | { type: 'specific'; dates: string[]; start_date?: string; end_date?: string }
  | { type: 'recurring'; start_date: string; end_date: string; days_of_week: string[] }
  | { type: 'range'; start_date: string; end_date: string };

interface CollabSpec {
  etape_id: string | null;
  section: string;
  invited: 'guide' | 'provider';
  message: string;
  contribution_data: Record<string, unknown>;
}

interface CircuitSpec {
  title: string;
  owner: 'guide' | 'provider';
  collabs?: CollabSpec[];
  data: Partial<Circuit>;
}

function etape(
  id: string,
  jour: number,
  titre: string,
  description: string,
  prix: number,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    jour,
    titre,
    description,
    categorie: 'eco_tour',
    heure_debut: '09:00',
    heure_fin: '17:00',
    prix,
    ...extra,
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
    entities: [User, Guide, Provider, Circuit, CircuitCollaboration],
    synchronize: false,
  });

  await ds.initialize();
  console.log('✅ Connected to Postgres');

  const users = ds.getRepository(User);
  const circuits = ds.getRepository(Circuit);
  const collabRepo = ds.getRepository(CircuitCollaboration);
  const guides = ds.getRepository(Guide);
  const providers = ds.getRepository(Provider);

  const guide = await users.findOne({ where: { email: 'guide@demo.local' } });
  const provider = await users.findOne({ where: { email: 'provider@demo.local' } });
  if (!guide || !provider) {
    console.error('❌ Demo users missing. Run: npm run seed:demo');
    process.exit(1);
  }

  const guideProfile = await guides.findOne({ where: { user_id: guide.id } });
  const provProfile = await providers.findOne({ where: { user_id: provider.id } });
  const guideLabel = guideProfile?.full_name ?? 'Youssef Mansouri';
  const providerLabel = provProfile
    ? `${provProfile.full_name} — ${provProfile.organization ?? 'Prestataire'}`
    : 'Leila Trabelsi — Écolodge Les Chênes';

  const catalogue: CircuitSpec[] = [
    // ── Enrichissement des 4 circuits demo ─────────────────────────────────
    {
      title: 'Trek des chênes-lièges — 2 jours',
      owner: 'guide',
      data: {
        description:
          'Randonnée accompagnée entre Aïn Draham et Tabarka : villages berbères, forêts de chênes-lièges et panoramas sur la mer.',
        nb_jours: 2,
        cover_image: IMG.trek,
        circuit_mode: 'single',
        price: 95,
        capacity: 12,
        min_group_size: 2,
        max_group_size: 8,
        confirmation_mode: 'manual',
        deposit_percentage: 30,
        booking_deadline_hours: 48,
        cancellation_policy:
          'Annulation gratuite jusqu\'à 7 jours avant le départ. 50 % remboursé entre 7 et 3 jours.',
        availability: {
          type: 'specific',
          dates: ['2026-09-15', '2026-09-22', '2026-10-06', '2026-10-20', '2026-11-03'],
        },
        etapes: [
          etape('e1', 1, 'Départ Aïn Draham', 'Montée en forêt, pause village et déjeuner terroir', 50),
          etape('e2', 2, 'Descente vers Tabarka', 'Point de vue mer, criques et retour', 45),
        ],
        tags: ['randonnee', 'foret', 'nord-ouest'],
        status: 'approved',
        sustainability_score: 78,
      },
    },
    {
      title: 'Circuit patrimoine berbère — 3 jours',
      owner: 'guide',
      data: {
        description:
          'Immersion culturelle au Kef : médina, villages de montagne et ateliers artisanaux. Composez votre parcours jour par jour.',
        nb_jours: 3,
        cover_image: IMG.heritage,
        circuit_mode: 'variant',
        price: 180,
        capacity: 10,
        min_group_size: 2,
        max_group_size: 6,
        confirmation_mode: 'manual',
        deposit_percentage: 25,
        booking_deadline_hours: 72,
        cancellation_policy: 'Acompte non remboursable sous 5 jours du départ.',
        availability: {
          type: 'recurring',
          start_date: '2026-06-01',
          end_date: '2026-11-30',
          days_of_week: ['4', '5'],
        },
        etapes: [
          etape('e1', 1, 'El Kef médina', 'Visite guidée des remparts et souks', 60, { optional: false }),
          etape('e2', 2, 'Villages de montagne', 'Rencontres locales et déjeuner chez l\'habitant', 70, { optional: true }),
          etape('e3', 3, 'Artisanat', 'Atelier poterie et démonstration tissage', 50, { optional: true }),
        ],
        tags: ['culture', 'patrimoine', 'artisanat'],
        status: 'approved',
        sustainability_score: 82,
      },
    },
    {
      title: 'Séjour nature Écolodge — 2 nuits',
      owner: 'provider',
      collabs: [
        {
          etape_id: null,
          section: 'hebergement',
          invited: 'guide',
          message: 'Animation nature et observation pour les sorties du séjour.',
          contribution_data: {
            guide_prix_base: 35,
            chambre_double__unit0__prix_unite: 85,
            chambre_famille__unit0__prix_unite: 110,
          },
        },
      ],
      data: {
        description:
          'Séjour tout compris à l\'écolodge : sentiers en forêt, observation des oiseaux, table d\'hôtes et nuitées écologiques.',
        nb_jours: 3,
        cover_image: IMG.lodge,
        circuit_mode: 'package',
        price: 220,
        capacity: 8,
        min_group_size: 1,
        max_group_size: 4,
        confirmation_mode: 'instant',
        deposit_percentage: 40,
        booking_deadline_hours: 24,
        cancellation_policy: 'Flexible : annulation gratuite 72 h avant.',
        availability: {
          type: 'specific',
          dates: ['2026-08-01', '2026-08-15', '2026-09-01', '2026-09-15', '2026-10-01'],
        },
        etapes: [
          etape('e1', 1, 'Accueil & forêt', 'Installation, balade découverte et dîner', 75),
          etape('e2', 2, 'Observation nature', 'Sortie matinale ornithologie avec guide', 80),
          etape('e3', 3, 'Départ', 'Petit-déjeuner bio et checkout', 65),
        ],
        hebergement: {
          inclus: true,
          type: 'same',
          name: 'Écolodge Les Chênes',
          etape: {
            subtypes: ['chambre_double', 'chambre_famille'],
            categorie: 'hebergement',
          },
        },
        tags: ['hebergement', 'nature', 'ecolodge'],
        status: 'approved',
        sustainability_score: 88,
      },
    },
    {
      title: 'Immersion gastronomique locale — 1 jour',
      owner: 'provider',
      data: {
        description:
          'Marché local, atelier cuisine avec produits du terroir et déjeuner convivial à l\'écolodge.',
        nb_jours: 1,
        cover_image: IMG.food,
        circuit_mode: 'single',
        price: 65,
        capacity: 15,
        min_group_size: 2,
        max_group_size: 10,
        confirmation_mode: 'manual',
        deposit_percentage: 20,
        booking_deadline_hours: 24,
        cancellation_policy: 'Remboursement intégral si annulation 48 h avant.',
        availability: {
          type: 'specific',
          dates: ['2026-07-12', '2026-07-26', '2026-08-09', '2026-08-23', '2026-09-06'],
        },
        etapes: [
          etape('e1', 1, 'Marché & cuisine', 'Courses, atelier culinaire et dégustation', 65, {
            heure_debut: '08:30',
            heure_fin: '15:00',
            categorie: 'gastronomie_locale',
          }),
        ],
        tags: ['gastronomie', 'local', 'terroir'],
        status: 'approved',
        sustainability_score: 80,
      },
    },

    // ── Nouveaux circuits complets ─────────────────────────────────────────
    {
      title: 'Grand Trek Tabarka — 4 jours côte & forêt',
      owner: 'guide',
      data: {
        description:
          'Trek itinérant de Tabarka à Aïn Draham : falaises, criques, gorges et nuits en gîte. Choisissez les étapes selon votre niveau.',
        nb_jours: 4,
        cover_image: IMG.coast,
        circuit_mode: 'variant',
        price: 320,
        capacity: 10,
        min_group_size: 3,
        max_group_size: 8,
        confirmation_mode: 'manual',
        deposit_percentage: 35,
        booking_deadline_hours: 96,
        cancellation_policy: 'Acompte de 35 % conservé en cas d\'annulation tardive.',
        availability: {
          type: 'specific',
          dates: ['2026-09-08', '2026-09-29', '2026-10-13', '2026-10-27'],
        },
        etapes: [
          etape('e1', 1, 'Falaises de Tabarka', 'Sentier littoral et grotte', 75, { optional: false }),
          etape('e2', 2, 'Gorges de Balou', 'Canyon et baignade naturelle', 85, { optional: true }),
          etape('e3', 3, 'Forêt de chênes-lièges', 'Traversée forestière', 90, { optional: true }),
          etape('e4', 4, 'Arrivée Aïn Draham', 'Panorama et retour', 70, { optional: false }),
        ],
        tags: ['trek', 'cote', 'aventure'],
        status: 'approved',
        sustainability_score: 76,
      },
    },
    {
      title: 'Observation oiseaux — Lac Ichkeul',
      owner: 'guide',
      data: {
        description:
          'Sortie ornithologique d\'une journée au parc national du Lac Ichkeul avec lunette et guide naturaliste.',
        nb_jours: 1,
        cover_image: IMG.birds,
        circuit_mode: 'single',
        price: 55,
        capacity: 12,
        min_group_size: 2,
        max_group_size: 10,
        confirmation_mode: 'instant',
        deposit_percentage: 0,
        booking_deadline_hours: 12,
        cancellation_policy: 'Annulation gratuite jusqu\'à la veille.',
        availability: {
          type: 'recurring',
          start_date: '2026-03-01',
          end_date: '2026-05-31',
          days_of_week: ['5', '6'],
        },
        etapes: [
          etape('e1', 1, 'Parc national Ichkeul', 'Observation flamants, cigognes et migrateurs', 55, {
            heure_debut: '06:30',
            heure_fin: '14:00',
            categorie: 'eco_tour',
          }),
        ],
        tags: ['ornithologie', 'nature', 'parc'],
        status: 'approved',
        sustainability_score: 90,
      },
    },
    {
      title: 'Weekend Yoga & Nature — Écolodge',
      owner: 'provider',
      collabs: [
        {
          etape_id: 'e2',
          section: 'bien_etre_spa',
          invited: 'guide',
          message: 'Sessions yoga matin et soir sur la terrasse de l\'écolodge.',
          contribution_data: { prix_base: 45, guide_prix_base: 45 },
        },
      ],
      data: {
        description:
          'Deux nuits ressourçantes : yoga en plein air, balades douces en forêt, cuisine saine et hébergement écologique.',
        nb_jours: 3,
        cover_image: IMG.yoga,
        circuit_mode: 'package',
        price: 195,
        capacity: 6,
        min_group_size: 1,
        max_group_size: 4,
        confirmation_mode: 'manual',
        deposit_percentage: 30,
        booking_deadline_hours: 48,
        cancellation_policy: '50 % remboursé si annulation 5 jours avant.',
        availability: {
          type: 'range',
          start_date: '2026-04-01',
          end_date: '2026-11-30',
        },
        etapes: [
          etape('e1', 1, 'Arrivée & accueil', 'Installation, cercle d\'ouverture et dîner léger', 60),
          etape('e2', 2, 'Yoga & forêt', 'Séances yoga et marche méditative', 75),
          etape('e3', 3, 'Clôture & départ', 'Yoga du matin et brunch', 60),
        ],
        hebergement: {
          inclus: true,
          type: 'same',
          name: 'Écolodge Les Chênes',
          etape: { subtypes: ['chambre_double'], categorie: 'hebergement' },
        },
        tags: ['bien_etre', 'yoga', 'slow_travel'],
        status: 'approved',
        sustainability_score: 91,
      },
    },
    {
      title: 'Kayak & sentiers côtiers — 2 jours',
      owner: 'guide',
      data: {
        description:
          'Package sport-nature : journée kayak le long des criques de Tabarka et randonnée côtière le lendemain.',
        nb_jours: 2,
        cover_image: IMG.kayak,
        circuit_mode: 'package',
        price: 140,
        capacity: 8,
        min_group_size: 2,
        max_group_size: 6,
        confirmation_mode: 'manual',
        deposit_percentage: 25,
        booking_deadline_hours: 48,
        cancellation_policy: 'Report possible une fois en cas de météo défavorable.',
        availability: {
          type: 'specific',
          dates: ['2026-06-14', '2026-07-05', '2026-08-16', '2026-09-20'],
        },
        etapes: [
          etape('e1', 1, 'Kayak criques', 'Initiation et parcours côtier encadré', 80, { categorie: 'activite' }),
          etape('e2', 2, 'Sentier des falaises', 'Randonnée panoramique sur les hauteurs', 60, { categorie: 'activite' }),
        ],
        tags: ['kayak', 'sport', 'mer'],
        status: 'approved',
        sustainability_score: 74,
      },
    },
    {
      title: 'Circuit Ouest sauvage — Guide & Terroir',
      owner: 'guide',
      collabs: [
        {
          etape_id: 'e2',
          section: 'restauration',
          invited: 'provider',
          message: 'Table d\'hôtes et déjeuner terroir pour l\'étape village.',
          contribution_data: {
            prix_base: 35,
            menu_traditionnel__unit0__prix_unite: 35,
            menu_vegetarien__unit0__prix_unite: 32,
          },
        },
      ],
      data: {
        description:
          'Circuit modulable : randonnée guidée + option restauration locale chez notre partenaire écolodge.',
        nb_jours: 2,
        cover_image: IMG.forest,
        circuit_mode: 'variant',
        price: 120,
        capacity: 12,
        min_group_size: 2,
        max_group_size: 8,
        confirmation_mode: 'manual',
        deposit_percentage: 20,
        booking_deadline_hours: 36,
        cancellation_policy: 'Annulation gratuite 72 h avant.',
        availability: {
          type: 'recurring',
          start_date: '2026-05-01',
          end_date: '2026-10-31',
          days_of_week: ['5', '6'],
        },
        etapes: [
          etape('e1', 1, 'Randonnée forêt', 'Boucle guidée en chênes-lièges', 55, { optional: false }),
          etape('e2', 2, 'Village & terroir', 'Rencontre producteurs et déjeuner', 65, {
            optional: true,
            subtypes: ['menu_traditionnel', 'menu_vegetarien'],
            categorie: 'restauration',
          }),
        ],
        tags: ['randonnee', 'terroir', 'collaboratif'],
        status: 'approved',
        sustainability_score: 83,
      },
    },
  ];

  let created = 0;
  let updated = 0;
  let collabsAdded = 0;

  for (const spec of catalogue) {
    const ownerId = spec.owner === 'guide' ? guide.id : provider.id;
    const ownerType = spec.owner;

    let saved = await circuits.findOne({ where: { title: spec.title } });
    const payload = {
      ...spec.data,
      title: spec.title,
      provider_id: ownerId,
      owner_type: ownerType,
    };

    if (saved) {
      Object.assign(saved, payload);
      saved = await circuits.save(saved);
      updated++;
      console.log('🔄 Updated:', spec.title);
    } else {
      saved = await circuits.save(circuits.create(payload));
      created++;
      console.log('✅ Created:', spec.title);
    }

    const circuitCollabs = await collabRepo.find({ where: { circuit_id: saved.id } });
    if (spec.collabs?.length) {
      for (const c of spec.collabs) {
        const invitee = c.invited === 'guide' ? guide : provider;
        const inviteeLabel = c.invited === 'guide' ? guideLabel : providerLabel;
        const exists = circuitCollabs.find(
          (x) => x.section === c.section && x.etape_id === c.etape_id,
        );
        if (exists) {
          exists.status = 'completed';
          exists.contribution_data = c.contribution_data;
          exists.message = c.message;
          await collabRepo.save(exists);
          continue;
        }
        await collabRepo.save(
          collabRepo.create({
            circuit_id: saved.id,
            etape_id: c.etape_id,
            owner_id: ownerId,
            invited_user_id: invitee.id,
            invited_user_type: c.invited,
            invited_user_name: inviteeLabel,
            section: c.section,
            status: 'completed',
            message: c.message,
            contribution_data: c.contribution_data,
          }),
        );
        collabsAdded++;
      }
    }

    const allCollabs = await collabRepo.find({ where: { circuit_id: saved.id } });
    const options = buildBookableOptions(saved, allCollabs);
    if (options.length) {
      await circuits.update({ id: saved.id }, { bookable_options: options as unknown as object[] });
      console.log(`   → ${options.length} option(s) réservable(s), dès ${Math.min(...options.map((o) => o.price_per_person))} TND/pers.`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(` Done: ${created} created, ${updated} updated, ${collabsAdded} collab(s) added`);
  console.log(` Guide   : ${guideLabel} (${guide.email})`);
  console.log(` Provider: ${providerLabel} (${provider.email})`);
  console.log('═══════════════════════════════════════════════════');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
