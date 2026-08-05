import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Answer,
  Question,
  QuestionCategory,
  Questionnaire,
  QuestionnaireAttempt,
  UserAnswer,
} from './entities/questionnaire.entities';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { EcoTravelerModule } from '../eco-traveler/eco-traveler.module';
import { GuideModule } from '../guide/guide.module';
import { ProviderModule } from '../provider/provider.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Questionnaire,
      QuestionCategory,
      Question,
      Answer,
      QuestionnaireAttempt,
      UserAnswer,
    ]),
    EcoTravelerModule,
    GuideModule,
    ProviderModule,
  ],
  providers: [QuestionnaireService],
  controllers: [QuestionnaireController],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
