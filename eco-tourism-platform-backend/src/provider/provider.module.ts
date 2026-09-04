import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [
    // Le score de durabilité se déduit de la progression des badges.
    BadgeModule,TypeOrmModule.forFeature([Provider, Organization])],
  providers: [ProviderService],
  controllers: [ProviderController],
  exports: [ProviderService],
})
export class ProviderModule {}
