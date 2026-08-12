import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Guide } from '../../guide/entities/guide.entity';
import { Provider } from '../../provider/entities/provider.entity';
import { ProfileApprovalService } from './profile-approval.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guide, Provider])],
  providers: [ProfileApprovalService],
  exports: [ProfileApprovalService],
})
export class ProfileApprovalModule {}
