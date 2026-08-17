import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../../users/entities/user.entity';
import { EcoTraveler } from '../../eco-traveler/entities/eco-traveler.entity';
import { Role } from '../../common/enums/roles.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuthMethod } from '../../common/enums/auth-method.enum';

config({ path: join(__dirname, '../../../.env.dev') });

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    entities: [User, EcoTraveler],
    synchronize: false,
  });

  await ds.initialize();
  const users = ds.getRepository(User);
  const travelers = ds.getRepository(EcoTraveler);
  const hash = await bcrypt.hash('Demo123!', 10);
  const now = new Date();

  const demos = [
    {
      email: 'traveler2@demo.local',
      full_name: 'Sarra Khelifi',
      bio: 'Amateur de randonnées côtières et de villages authentiques.',
      interests: ['plage', 'randonnee', 'photo'],
    },
    {
      email: 'traveler3@demo.local',
      full_name: 'Karim Bouazizi',
      bio: 'Éco-voyageur curieux, fan de gastronomie locale.',
      interests: ['gastronomie', 'culture', 'velo'],
    },
  ];

  for (const d of demos) {
    const exists = await users.findOne({ where: { email: d.email } });
    if (exists) {
      console.log('Skip (already exists):', d.email);
      continue;
    }

    const u = await users.save(
      users.create({
        email: d.email,
        password: hash,
        auth_method: AuthMethod.EMAIL,
        role: Role.ECO_TRAVELER,
        status: UserStatus.ACTIVE,
        email_verified_at: now,
      }),
    );

    await travelers.save({
      user_id: u.id,
      full_name: d.full_name,
      bio: d.bio,
      country: 'Tunisie',
      language: 'fr',
      traveler_types: ['aventure'],
      motivations: ['nature'],
      landscapes: ['mer', 'montagne'],
      travel_styles: ['slow_travel'],
      interests: d.interests,
      profile_completion: 80,
      is_onboarded: true,
      sustainability_score: 65,
    });

    console.log('Created:', d.email, '—', d.full_name);
  }

  await ds.destroy();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
