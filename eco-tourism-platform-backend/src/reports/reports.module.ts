import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { User } from '../users/entities/user.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { MailModule } from '../mail/mail.module';
import { Guide } from '../guide/entities/guide.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, User, EcoTraveler, Provider, Guide]),
    MailModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
