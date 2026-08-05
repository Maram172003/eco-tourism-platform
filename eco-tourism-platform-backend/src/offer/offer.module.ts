import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer } from './entities/offer.entity';
import { OfferSession } from './entities/offer-session.entity';
import { OfferCollaboration } from './entities/offer-collaboration.entity';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import { ProviderActivity } from '../provider-activity/entities/provider-activity.entity';
import { ActivityDetails, ActivityDetailsSchema } from '../provider-activity/schemas/activity-details.schema';
import { GuideAvailabilitySlot } from '../guide/entities/guide-availability.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, OfferSession, ProviderActivity, OfferCollaboration, GuideAvailabilitySlot, Guide, Provider, Organization]),
    MongooseModule.forFeature([
      { name: ActivityDetails.name, schema: ActivityDetailsSchema },
    ]),
    NotificationModule,
  ],
  providers: [OfferService],
  controllers: [OfferController],
  exports: [OfferService],
})
export class OfferModule {}
