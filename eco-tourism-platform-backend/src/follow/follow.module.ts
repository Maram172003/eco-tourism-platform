import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entity';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { Provider } from '../provider/entities/provider.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Guide } from '../guide/entities/guide.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, Provider, EcoTraveler, Guide])],
  providers: [FollowService],
  controllers: [FollowController],
  exports: [FollowService],
})
export class FollowModule {}
