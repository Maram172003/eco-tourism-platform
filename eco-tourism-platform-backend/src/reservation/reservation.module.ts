import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationParticipant } from './entities/reservation-participant.entity';
import { Offer } from '../offer/entities/offer.entity';
import { OfferSession } from '../offer/entities/offer-session.entity';
import { Circuit } from '../circuit/entities/circuit.entity';
import { CircuitCollaboration } from '../circuit/entities/circuit-collaboration.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { ReservationService } from './reservation.service';
import { ReservationCircuitService } from './reservation-circuit.service';
import { ReservationController } from './reservation.controller';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notifications/notification.module';
import { OfferCollaboration } from '../offer/entities/offer-collaboration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      ReservationParticipant,
      Offer,
      OfferSession,
      Circuit,
      CircuitCollaboration,
      OfferCollaboration,
      EcoTraveler,
      Guide,
      Provider,
      User,
    ]),
    MailModule,
    NotificationModule,
  ],
  providers: [ReservationService, ReservationCircuitService],
  controllers: [ReservationController],
  exports: [ReservationService, ReservationCircuitService],
})
export class ReservationModule {}
