import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BadgeService } from './badge.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Badges')
@Controller('badges')
export class BadgeController {
  constructor(private readonly service: BadgeService) {}

  /** Mes compteurs, pour la grille de badges du tableau de bord. */
  @ApiBearerAuth('bearer')
  @Roles(Role.GUIDE, Role.PROVIDER, Role.ECO_TRAVELER)
  @Get('me')
  mine(@Req() req: any) {
    return this.service.getStats(req.user.sub, req.user.role);
  }

  /**
   * Compteurs d'un profil public : les badges sont visibles par les visiteurs,
   * comme les scores de durabilité. Ne renvoie que des agrégats déjà publics.
   */
  @Public()
  @Get(':userId/:role')
  public(@Param('userId') userId: string, @Param('role') role: string) {
    return this.service.getStats(userId, role);
  }
}
