import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { Public } from '../common/decorators/public.decorator';
import { CircuitService } from './circuit.service';
import { CreateCircuitDto, UpdateCircuitDto } from './dto/circuit.dto';

@ApiTags('Circuits')
@Controller('circuits')
export class CircuitController {
  constructor(private readonly service: CircuitService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Public()
  @Get('all-public')
  findAllPublic() {
    return this.service.findAllPublic();
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Post()
  create(@Req() req: any, @Body() dto: CreateCircuitDto) {
    const ownerType = req.user.role === Role.GUIDE ? 'guide' : 'provider';
    return this.service.create(req.user.sub, dto, ownerType);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.service.findByProvider(req.user.sub);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROVIDER, Role.ADMIN)
  @Get('public/:userId')
  findPublishedByUser(@Param('userId') userId: string) {
    return this.service.findPublishedByUser(userId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROVIDER, Role.ADMIN)
  @Get(':id/public-detail')
  findPublicDetail(@Param('id') id: string) {
    return this.service.findPublicDetail(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCircuitDto) {
    return this.service.update(id, req.user.sub, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.sub);
  }

  // ── Publication ───────────────────────────────────────────────────────────

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Post(':id/publish')
  publish(@Req() req: any, @Param('id') id: string) {
    return this.service.publishCircuit(req.user.sub, id);
  }

  // ── Validation dispo guide pour ses propres étapes ────────────────────────

  @ApiBearerAuth('bearer')
  @Roles(Role.GUIDE)
  @Post('validate-guide-etapes')
  validateGuideEtapes(
    @Req() req: any,
    @Body() body: {
      availability: any;
      nb_jours: number;
      etapes: Array<{ jour: number; heure_debut: string; heure_fin: string }>;
    },
  ) {
    return this.service.validateGuideEtapes(req.user.sub, body.availability, body.nb_jours, body.etapes);
  }

  // ── Collaboration (propriétaire du circuit) ───────────────────────────────

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Post(':id/collaborations')
  inviteCollaborator(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: {
      etape_id: string | null;
      invited_user_id: string;
      invited_user_type: string;
      invited_user_name: string;
      section: string;
      message?: string;
    },
  ) {
    return this.service.inviteCircuitCollaborator(req.user.sub, id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Get(':id/collaborations')
  getCollaborations(@Req() req: any, @Param('id') id: string) {
    return this.service.getCircuitCollaborations(req.user.sub, id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Post(':id/collab-conflicts')
  checkConflicts(@Req() req: any, @Param('id') id: string, @Body() body: { availability: any; etapes?: any[] }) {
    return this.service.checkCircuitCollabConflicts(req.user.sub, id, body.availability, body.etapes);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Post(':id/collaborations/:collabId/kick')
  kick(@Req() req: any, @Param('id') _id: string, @Param('collabId') collabId: string) {
    return this.service.kickCircuitCollaborator(req.user.sub, collabId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER, Role.GUIDE)
  @Post(':id/collaborations/:collabId/sync-etape-schedule')
  syncEtapeSchedule(
    @Req() req: any,
    @Param('id') _id: string,
    @Param('collabId') collabId: string,
    @Body() body: { heure_debut: string; heure_fin: string },
  ) {
    return this.service.syncEtapeSchedule(req.user.sub, collabId, body.heure_debut, body.heure_fin);
  }

  // ── Collaboration (invitée — guide ou prestataire) ────────────────────────
  // Note : respond / withdraw / contribution passent par /guide/collaborations/:id/*
  // car ces endpoints sont partagés offre+circuit dans guide.service.ts

  @ApiBearerAuth('bearer')
  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get('my-circuit-collabs')
  findMyCollaborations(@Req() req: any) {
    return this.service.findMyCircuitCollaborations(req.user.sub);
  }

  /** Vue complète du circuit pour un collaborateur invité */
  @ApiBearerAuth('bearer')
  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get(':id/view')
  viewForCollaborator(@Req() req: any, @Param('id') id: string) {
    return this.service.findForCollaborator(id, req.user.sub);
  }
}
