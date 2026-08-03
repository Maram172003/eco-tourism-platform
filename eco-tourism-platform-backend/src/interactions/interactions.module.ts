import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemLike } from './entities/item-like.entity';
import { ItemComment } from './entities/item-comment.entity';
import { ItemCommentLike } from './entities/item-comment-like.entity';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Offer } from '../offer/entities/offer.entity';
import { Circuit } from '../circuit/entities/circuit.entity';
import { Guide } from '../guide/entities/guide.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemLike, ItemComment, ItemCommentLike, EcoTraveler, Provider, Offer, Circuit, Guide]),
  ],
  providers: [InteractionsService],
  controllers: [InteractionsController],
  exports: [InteractionsService],
})
export class InteractionsModule {}
