import { Body, Controller, Delete, Get, Patch, Post, Req, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { Public } from '../common/decorators/public.decorator';
import { GuideService } from './guide.service';
import {
  CompleteGuideProfileDto,
  UpdateGuideSpecialtiesDto,
  UpdateGuideExperienceDto,
  UpdateGuideIdentityDto,
  UpdateGuideCertificationsDto,
  UpdateGuideServicesDto,
  CreateGuideOfferDto,
  SaveOfferDraftDto,
  SaveAvailabilitySlotDto,
} from './dto/guide.dto';

@ApiTags('Guide')
@ApiBearerAuth('bearer')
@Roles(Role.GUIDE)
@Controller('guide')
export class GuideController {
  constructor(private readonly service: GuideService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.sub);
  }

  @Post('profile')
  completeProfile(@Req() req: any, @Body() dto: CompleteGuideProfileDto) {
    return this.service.completeProfile(req.user.sub, dto);
  }

  @Patch('specialties')
  updateSpecialties(@Req() req: any, @Body() dto: UpdateGuideSpecialtiesDto) {
    return this.service.updateSpecialties(req.user.sub, dto);
  }

  @Patch('experience')
  updateExperience(@Req() req: any, @Body() dto: UpdateGuideExperienceDto) {
    return this.service.updateExperience(req.user.sub, dto);
  }

  @Post('onboarded')
  markOnboarded(@Req() req: any) {
    return this.service.markOnboarded(req.user.sub);
  }

  // ── Nouveaux endpoints onboarding 6 étapes ────────────────────────────────

  @Post('identity')
  updateIdentity(@Req() req: any, @Body() dto: UpdateGuideIdentityDto) {
    return this.service.updateIdentity(req.user.sub, dto);
  }

  @Patch('certifications')
  updateCertifications(@Req() req: any, @Body() dto: UpdateGuideCertificationsDto) {
    return this.service.updateCertifications(req.user.sub, dto);
  }

  @Patch('services')
  updateServices(@Req() req: any, @Body() dto: UpdateGuideServicesDto) {
    return this.service.updateServices(req.user.sub, dto);
  }

  // ── Offres ────────────────────────────────────────────────────────────────

  @Get('offers')
  getMyOffers(@Req() req: any) {
    return this.service.getMyOffers(req.user.sub);
  }

  @Post('offers')
  createOffer(@Req() req: any, @Body() dto: CreateGuideOfferDto) {
    return this.service.createOffer(req.user.sub, dto);
  }

  @Post('offers/draft')
  saveOfferDraft(@Req() req: any, @Body() dto: SaveOfferDraftDto) {
    return this.service.saveOfferDraft(req.user.sub, dto);
  }

  @Patch('offers/:id')
  updateOffer(@Req() req: any, @Param('id') id: string, @Body() dto: CreateGuideOfferDto) {
    return this.service.updateOffer(req.user.sub, id, dto);
  }

  @Patch('offers/:id/availability')
  updateOfferAvailability(@Req() req: any, @Param('id') id: string, @Body('disponibilite') disponibilite: any) {
    return this.service.updateOfferAvailability(req.user.sub, id, disponibilite);
  }

  @Delete('offers/:id')
  deleteOffer(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteOffer(req.user.sub, id);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Post('offers/:offerId/collab-conflicts')
  checkCollabConflicts(@Req() req: any, @Param('offerId') offerId: string, @Body('disponibilite') disponibilite: any) {
    return this.service.checkCollabConflicts(req.user.sub, offerId, disponibilite);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Post('offers/:offerId/collaborations')
  inviteCollaborator(@Req() req: any, @Param('offerId') offerId: string, @Body() body: any) {
    return this.service.inviteCollaborator(req.user.sub, offerId, body);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get('offers/:offerId/collaborations')
  getCollaborations(@Req() req: any, @Param('offerId') offerId: string) {
    return this.service.getOfferCollaborations(req.user.sub, offerId);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get('collaborators/search')
  searchCollaborators(
    @Req() req: any,
    @Query('q') q: string,
    @Query('section') section?: string,
    @Query('mode') mode?: string,
  ) {
    return this.service.searchCollaborators(q ?? '', req.user.sub, section, mode);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get('collaborations/mine')
  findMyCollaborations(@Req() req: any) {
    return this.service.findMyCollaborations(req.user.sub);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get('collaborations/:collabId/status')
  getCollaborationStatus(@Req() req: any, @Param('collabId') collabId: string) {
    return this.service.getCollaborationStatus(req.user.sub, collabId);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Patch('collaborations/leave')
  leaveCollabBySlotLabel(@Req() req: any, @Body('slotLabel') slotLabel: string) {
    return this.service.leaveCollabBySlotLabel(req.user.sub, slotLabel);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Patch('collaborations/:collabId/respond')
  respondToCollaboration(
    @Req() req: any,
    @Param('collabId') collabId: string,
    @Body('status') status: 'accepted' | 'declined',
  ) {
    return this.service.respondToCollaboration(req.user.sub, collabId, status);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Get('offers/:offerId/detail')
  getOfferForCollaborator(@Req() req: any, @Param('offerId') offerId: string) {
    return this.service.getOfferForCollaborator(req.user.sub, offerId);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Patch('collaborations/:collabId/contribution')
  saveContribution(@Req() req: any, @Param('collabId') collabId: string, @Body() body: Record<string, any>) {
    return this.service.saveContribution(req.user.sub, collabId, body);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Patch('collaborations/:collabId/withdraw')
  withdrawContribution(@Req() req: any, @Param('collabId') collabId: string) {
    return this.service.withdrawContribution(req.user.sub, collabId);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Delete('collaborations/:collabId')
  dismissCollaboration(@Req() req: any, @Param('collabId') collabId: string) {
    return this.service.dismissCollaboration(req.user.sub, collabId);
  }

  @Roles(Role.GUIDE, Role.PROVIDER)
  @Patch('collaborations/:collabId/kick')
  kickCollaborator(@Req() req: any, @Param('collabId') collabId: string) {
    return this.service.kickCollaborator(req.user.sub, collabId);
  }

  @Post('offers/:offerId/publish')
  publishOffer(@Req() req: any, @Param('offerId') offerId: string) {
    return this.service.publishOffer(req.user.sub, offerId);
  }


  // ── Disponibilités ────────────────────────────────────────────────────────────

  @Get('availability')
  getAvailability(@Req() req: any) {
    return this.service.getAvailability(req.user.sub);
  }

  @Post('availability')
  saveAvailabilitySlot(@Req() req: any, @Body() dto: SaveAvailabilitySlotDto) {
    return this.service.saveAvailabilitySlot(req.user.sub, dto);
  }

  @Delete('availability/:id')
  deleteAvailabilitySlot(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteAvailabilitySlot(req.user.sub, id);
  }

  @Public() @Roles()
  @Get('public/search')
  searchGuides(@Query('q') q: string) {
    return this.service.searchGuides(q ?? '');
  }

  @Public() @Roles()
  @Get('public/:userId/availability')
  getPublicAvailability(@Param('userId') userId: string) {
    return this.service.getAvailability(userId);
  }

  @Public() @Roles()
  @Get('public/:userId')
  getPublicProfile(@Param('userId') userId: string) {
    return this.service.getPublicProfile(userId);
  }
}
