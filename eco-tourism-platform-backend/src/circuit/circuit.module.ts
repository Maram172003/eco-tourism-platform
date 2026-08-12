import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Circuit } from './entities/circuit.entity';
import { CircuitCollaboration } from './entities/circuit-collaboration.entity';
import { GuideAvailabilitySlot } from '../guide/entities/guide-availability.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { CircuitService } from './circuit.service';
import { CircuitController } from './circuit.controller';
import { NotificationModule } from '../notifications/notification.module';
import { ProfileApprovalModule } from '../common/services/profile-approval.module';

@Module({
  imports: [
    ProfileApprovalModule,
    TypeOrmModule.forFeature([Circuit, CircuitCollaboration, GuideAvailabilitySlot, Guide, Provider, Organization]),
    NotificationModule,
  ],
  providers: [CircuitService],
  controllers: [CircuitController],
  exports: [CircuitService],
})
export class CircuitModule {}
