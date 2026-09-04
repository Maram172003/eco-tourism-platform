import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { EcoTraveler } from './entities/eco-traveler.entity';
import { Friendship } from './entities/friendship.entity';
import { Publication } from '../publication/entities/publication.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { EcoTravelerService } from './eco-traveler.service';
import { EcoTravelerController } from './eco-traveler.controller';
import { EcoTravelerMongoService } from './eco-traveler-mongo.service';
import { BadgeModule } from '../badge/badge.module';
import { ReportsModule } from '../reports/reports.module';

import {
  TravelerPreferences,
  TravelerPreferencesSchema,
} from './schemas/traveler-preferences.schema';
import {
  TravelerEngagement,
  TravelerEngagementSchema,
} from './schemas/traveler-engagement.schema';

@Module({
  imports: [
    // Un signalement est un signalement, pas une amitié.
    ReportsModule,
    // Le score de durabilité se déduit de la progression des badges.
    BadgeModule,
    // PostgreSQL
    TypeOrmModule.forFeature([EcoTraveler, Publication, Friendship, Reservation]),

    // MongoDB
    MongooseModule.forFeature([
      { name: TravelerPreferences.name, schema: TravelerPreferencesSchema },
      { name: TravelerEngagement.name, schema: TravelerEngagementSchema },
    ]),
  ],
  providers: [EcoTravelerService, EcoTravelerMongoService],
  controllers: [EcoTravelerController],
  exports: [EcoTravelerService, EcoTravelerMongoService],
})
export class EcoTravelerModule {}