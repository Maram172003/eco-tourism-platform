import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { Guide } from './entities/guide.entity';
import { GuideAvailabilitySlot } from './entities/guide-availability.entity';
import { Offer } from '../offer/entities/offer.entity';
import { OfferCollaboration } from '../offer/entities/offer-collaboration.entity';
import { Organization } from '../organization/entities/organization.entity';
import { Provider } from '../provider/entities/provider.entity';
import { GuideService } from './guide.service';
import { GuideController } from './guide.controller';
import { NotificationModule } from '../notifications/notification.module';
import { GuideMongoService } from './guide-mongo.service';
import { GuideSkills, GuideSkillsSchema } from './schemas/guide-skills.schema';
import { GuideEngagement, GuideEngagementSchema } from './schemas/guide-engagement.schema';
import { CircuitModule } from '../circuit/circuit.module';
import { ProfileApprovalModule } from '../common/services/profile-approval.module';

@Module({
  imports: [
    ProfileApprovalModule,
    TypeOrmModule.forFeature([Guide, Offer, GuideAvailabilitySlot, OfferCollaboration, Organization, Provider]),
    MongooseModule.forFeature([
      { name: GuideSkills.name, schema: GuideSkillsSchema },
      { name: GuideEngagement.name, schema: GuideEngagementSchema },
    ]),
    NotificationModule,
    forwardRef(() => CircuitModule),
  ],
  providers: [GuideService, GuideMongoService],
  controllers: [GuideController],
  exports: [GuideService, GuideMongoService],
})
export class GuideModule {}
