import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Circuit } from './entities/circuit.entity';
import { CircuitCollaboration } from './entities/circuit-collaboration.entity';
import { GuideAvailabilitySlot } from '../guide/entities/guide-availability.entity';
import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { CircuitService } from './circuit.service';
import { CircuitController } from './circuit.controller';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Circuit, CircuitCollaboration, GuideAvailabilitySlot, Guide, Provider]),
    NotificationModule,
  ],
  providers: [CircuitService],
  controllers: [CircuitController],
  exports: [CircuitService],
})
export class CircuitModule {}
