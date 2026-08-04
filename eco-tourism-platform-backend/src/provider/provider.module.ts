import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { ProviderService } from './provider.service';
import { ProviderController } from './provider.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, Organization])],
  providers: [ProviderService],
  controllers: [ProviderController],
  exports: [ProviderService],
})
export class ProviderModule {}
