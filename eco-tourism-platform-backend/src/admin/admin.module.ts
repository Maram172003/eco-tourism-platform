import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publication } from '../publication/entities/publication.entity';
import { Offer } from '../offer/entities/offer.entity';
import { User } from '../users/entities/user.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Guide } from '../guide/entities/guide.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ReportsModule } from '../reports/reports.module';
import { MailModule } from '../mail/mail.module';
import { MongooseModule } from '@nestjs/mongoose';
import { GuideSkills, GuideSkillsSchema } from '../guide/schemas/guide-skills.schema';
import { Organization } from '../organization/entities/organization.entity';
import { ProviderActivity } from '../provider-activity/entities/provider-activity.entity';
import { ActivityDetails, ActivityDetailsSchema } from '../provider-activity/schemas/activity-details.schema';
import { NotificationModule } from '../notifications/notification.module';
import { RejectionCleanupService } from './rejection-cleanup.service';

@Module({
  imports: [
    NotificationModule,
    MongooseModule.forFeature([
      { name: GuideSkills.name, schema: GuideSkillsSchema },
      { name: ActivityDetails.name, schema: ActivityDetailsSchema },
    ]),
    TypeOrmModule.forFeature([Publication, Offer, User, EcoTraveler, Provider, Guide, Organization, ProviderActivity]),
    ReportsModule,
    MailModule,
  ],
  providers: [RejectionCleanupService, AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
