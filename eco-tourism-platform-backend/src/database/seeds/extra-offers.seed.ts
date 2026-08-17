/**
 * Extra demo offers for manual reservation testing.
 * Idempotent by title — also syncs distinct disponibilite periods.
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../../users/entities/user.entity';
import { Offer } from '../../offer/entities/offer.entity';
import { OfferSession } from '../../offer/entities/offer-session.entity';
import { Organization } from '../../organization/entities/organization.entity';

config({ path: join(__dirname, '../../../.env.dev') });

type Dispo =
  | { type: 'range'; start_date: string; end_date: string }
  | { type: 'specific'; start_date: string; end_date: string; dates: string[] }
  | {
      type: 'recurring';
      start_date: string;
      end_date: string;
      days_of_week: string[];
    };

function period(start: string, end: string): Dispo {
  return { type: 'range', start_date: start, end_date: end };
}

function applyDispo(offer: Offer, dispo: Dispo) {
  const details = { ...((offer.details as Record<string, unknown>) ?? {}) };
  details.disponibilite = dispo;
  offer.details = details;
  offer.availability_start = new Date(dispo.start_date) as any;
  offer.availability_end = new Date(dispo.end_date) as any;
}

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    entities: [User, Offer, OfferSession, Organization],
    synchronize: false,
  });

  await ds.initialize();
  const users = ds.getRepository(User);
  const offers = ds.getRepository(Offer);
  const sessions = ds.getRepository(OfferSession);
  const orgs = ds.getRepository(Organization);

  const guide = await users.findOne({ where: { email: 'guide@demo.local' } });
  const provider = await users.findOne({ where: { email: 'provider@demo.local' } });
  if (!guide || !provider) {
    console.error('Demo guide/provider missing. Run seed:demo first.');
    process.exit(1);
  }

  const org = await orgs.findOne({ where: { provider_id: provider.id } });

  // Distinct periods per offer (also used to refresh existing rows)
  const byTitle: Record<string, Dispo> = {
    // Demo catalogue
    "Randonnée demi-journée forêt d'Aïn Draham": period('2026-09-01', '2026-11-30'),
    'Visite guidée patrimoine El Kef': {
      type: 'specific',
      start_date: '2026-09-15',
      end_date: '2026-10-20',
      dates: ['2026-09-15', '2026-09-22', '2026-10-06', '2026-10-20'],
    },
    'Nuitée Écolodge Les Chênes': period('2026-10-01', '2027-03-31'),
    "Table d'hôtes produits du terroir": {
      type: 'recurring',
      start_date: '2026-09-01',
      end_date: '2026-12-20',
      days_of_week: ['4', '5'], // ven + sam
    },
    'Week-end forêt : trek + nuitée écolodge': {
      type: 'specific',
      start_date: '2026-10-10',
      end_date: '2026-11-15',
      dates: ['2026-10-10', '2026-10-24', '2026-11-07', '2026-11-14'],
    },
    // Test offers
    '[TEST] Lever de soleil — 4 places max (instant)': period('2026-08-20', '2026-09-30'),
    '[TEST] Atelier observation oiseaux (manuel)': period('2026-10-01', '2026-11-15'),
    '[TEST] Trek cascade — séances planifiées (instant)': period('2026-09-15', '2026-10-15'),
    '[TEST] Brunch écolodge (instant)': {
      type: 'recurring',
      start_date: '2026-09-01',
      end_date: '2027-01-31',
      days_of_week: ['5', '6'], // sam + dim
    },
    '[TEST] Suite éco — 2 places (manuel)': period('2026-11-01', '2027-02-28'),
    '[TEST] Atelier cuisine groupe (manuel)': {
      type: 'specific',
      start_date: '2026-09-12',
      end_date: '2026-12-05',
      dates: ['2026-09-12', '2026-10-10', '2026-11-14', '2026-12-05'],
    },
  };

  const toCreate: Partial<Offer>[] = [
    {
      author_id: guide.id,
      author_type: 'guide',
      title: '[TEST] Lever de soleil — 4 places max (instant)',
      description: 'Petite sortie matinale. Confirmation instantanée. Capacité limitée pour tester le FIFO.',
      price: 25,
      duration: '2h',
      offer_type: 'guide',
      offer_subtype: 'randonnee',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'instant',
      price_type: 'per_person',
      capacity: 4,
      max_group_size: 4,
      min_group_size: 1,
      region: 'Jendouba',
      meeting_point: 'Belvédère Aïn Draham',
      status: 'approved',
      sustainability_score: 70,
      tags: ['test', 'instant', 'petite_capacite'],
      availability_mode: 'period',
      availability_start: new Date('2026-08-20') as any,
      availability_end: new Date('2026-09-30') as any,
      details: { disponibilite: byTitle['[TEST] Lever de soleil — 4 places max (instant)'] },
    },
    {
      author_id: guide.id,
      author_type: 'guide',
      title: '[TEST] Atelier observation oiseaux (manuel)',
      description: 'Sortie ornithologique. Le guide confirme manuellement.',
      price: 55,
      duration: 'demi-journée',
      offer_type: 'guide',
      offer_subtype: 'nature',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_person',
      capacity: 10,
      max_group_size: 10,
      region: 'Tabarka',
      meeting_point: 'Port de Tabarka',
      status: 'approved',
      sustainability_score: 75,
      tags: ['test', 'manual'],
      availability_mode: 'period',
      availability_start: new Date('2026-10-01') as any,
      availability_end: new Date('2026-11-15') as any,
      details: { disponibilite: byTitle['[TEST] Atelier observation oiseaux (manuel)'] },
    },
    {
      author_id: guide.id,
      author_type: 'guide',
      title: '[TEST] Trek cascade — séances planifiées (instant)',
      description: 'Choisissez une séance. Confirmation instantanée si places dispo.',
      price: 60,
      duration: '1 journée',
      offer_type: 'guide',
      offer_subtype: 'trek',
      fulfillment_mode: 'scheduled',
      confirmation_mode: 'instant',
      price_type: 'per_person',
      capacity: 6,
      max_group_size: 6,
      region: 'Aïn Draham',
      meeting_point: 'Parking forêt',
      status: 'approved',
      sustainability_score: 80,
      tags: ['test', 'scheduled', 'instant'],
      availability_mode: 'period',
      availability_start: new Date('2026-09-15') as any,
      availability_end: new Date('2026-10-15') as any,
      details: { disponibilite: byTitle['[TEST] Trek cascade — séances planifiées (instant)'] },
    },
    {
      author_id: provider.id,
      author_type: 'provider',
      organization_id: org?.id ?? null,
      title: '[TEST] Brunch écolodge (instant)',
      description: 'Brunch produits locaux. Confirmation immédiate.',
      price: 35,
      duration: '2h',
      offer_type: 'restauration',
      offer_subtype: 'brunch',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'instant',
      price_type: 'per_person',
      capacity: 12,
      max_group_size: 12,
      region: 'Jendouba',
      meeting_point: 'Écolodge Les Chênes',
      status: 'approved',
      sustainability_score: 85,
      tags: ['test', 'instant'],
      deposit_percentage: 20,
      availability_mode: 'period',
      availability_start: new Date('2026-09-01') as any,
      availability_end: new Date('2027-01-31') as any,
      details: { disponibilite: byTitle['[TEST] Brunch écolodge (instant)'] },
    },
    {
      author_id: provider.id,
      author_type: 'provider',
      organization_id: org?.id ?? null,
      title: '[TEST] Suite éco — 2 places (manuel)',
      description: 'Chambre pour 2. Confirmation manuelle du prestataire.',
      price: 150,
      duration: '1 nuit',
      offer_type: 'hebergement',
      offer_subtype: 'suite',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_night',
      capacity: 2,
      max_group_size: 2,
      region: 'Jendouba',
      meeting_point: 'Écolodge Les Chênes',
      status: 'approved',
      sustainability_score: 90,
      tags: ['test', 'manual', 'petite_capacite'],
      deposit_percentage: 30,
      availability_mode: 'period',
      availability_start: new Date('2026-11-01') as any,
      availability_end: new Date('2027-02-28') as any,
      details: { disponibilite: byTitle['[TEST] Suite éco — 2 places (manuel)'] },
    },
    {
      author_id: provider.id,
      author_type: 'provider',
      organization_id: org?.id ?? null,
      title: '[TEST] Atelier cuisine groupe (manuel)',
      description: 'Idéal pour tester invitations plateforme + emails.',
      price: 50,
      duration: '3h',
      offer_type: 'restauration',
      offer_subtype: 'atelier',
      fulfillment_mode: 'on_request',
      confirmation_mode: 'manual',
      price_type: 'per_person',
      capacity: 8,
      max_group_size: 8,
      region: 'Jendouba',
      meeting_point: "Cuisine de l'écolodge",
      status: 'approved',
      sustainability_score: 82,
      tags: ['test', 'manual', 'groupe'],
      availability_mode: 'period',
      availability_start: new Date('2026-09-12') as any,
      availability_end: new Date('2026-12-05') as any,
      details: { disponibilite: byTitle['[TEST] Atelier cuisine groupe (manuel)'] },
    },
  ];

  let created = 0;
  let synced = 0;

  for (const data of toCreate) {
    const exists = await offers.findOne({ where: { title: data.title! } });
    const dispo = byTitle[data.title!];
    if (exists) {
      applyDispo(exists, dispo);
      await offers.save(exists);
      synced++;
      console.log('Synced:', data.title, `→ ${dispo.type} ${dispo.start_date}…${dispo.end_date}`);
      continue;
    }
    const saved = await offers.save(offers.create(data));
    created++;
    console.log('Created:', saved.title, `| ${saved.confirmation_mode} | cap ${saved.capacity}`);

    if (saved.fulfillment_mode === 'scheduled') {
      const dates = ['2026-09-20', '2026-09-27', '2026-10-04'];
      for (const date of dates) {
        await sessions.save(
          sessions.create({
            offer_id: saved.id,
            date,
            start_time: '08:00',
            end_time: '16:00',
            capacity: 6,
            spots_taken: 0,
            status: 'scheduled',
          }),
        );
      }
      console.log('  + 3 sessions added');
    }
  }

  // Sync demo catalogue offers to their distinct periods
  for (const [title, dispo] of Object.entries(byTitle)) {
    if (title.startsWith('[TEST]')) continue;
    const offer = await offers.findOne({ where: { title } });
    if (!offer) continue;
    applyDispo(offer, dispo);
    await offers.save(offer);
    synced++;
    console.log('Synced:', title, `→ ${dispo.type} ${dispo.start_date}…${dispo.end_date}`);
  }

  console.log(`\nDone. ${created} new offer(s), ${synced} synced with unique periods.`);
  await ds.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
