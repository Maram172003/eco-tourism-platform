import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Reports')
@ApiBearerAuth('bearer')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  // `Role.PROVIDER` manquait : un prestataire recevait un 403 en signalant,
  // et l'écran lui annonçait quand même que le signalement était parti.
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROVIDER, Role.PROJECT)
  @Post()
  create(@Req() req: any, @Body() body: { reported_id: string; reason: string }) {
    return this.service.createReport(req.user.sub, req.user.role, body.reported_id, body.reason ?? '');
  }
}
