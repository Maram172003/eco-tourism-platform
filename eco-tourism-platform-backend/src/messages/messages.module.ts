import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Guide } from '../guide/entities/guide.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, EcoTraveler, Provider, Guide, User])],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
