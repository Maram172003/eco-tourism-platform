import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from '../offer/entities/offer.entity';
import { Circuit } from '../circuit/entities/circuit.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PlaceContribution } from '../place-contribution/entities/place-contribution.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    Offer, Circuit, Publication, PlaceContribution, Guide, Provider, EcoTraveler,
  ])],
  controllers: [BadgeController],
  providers: [BadgeService],
  // Les services de profil s'en servent pour rafraîchir le score à la lecture.
  exports: [BadgeService],
})
export class BadgeModule {}
