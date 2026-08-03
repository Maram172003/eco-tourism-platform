import { Body, Controller, Delete, Patch, Post, Req, Get, Param, Query } from "@nestjs/common";
import { EcoTravelerService } from "./eco-traveler.service";
import { CompleteProfileDto, UpdateGoalsDto, UpdateInterestsDto, UpdateMotivationsDto, UpdateTravelerTypesDto } from "./dto/eco-traveler.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/roles.enum";
import { Public } from "../common/decorators/public.decorator";
@ApiTags('Eco-Traveler')
@ApiBearerAuth('bearer')
@Roles(Role.ECO_TRAVELER)
@Controller('eco-traveler')
export class EcoTravelerController {
  constructor(private readonly service: EcoTravelerService) {}
 
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.sub);
  }
 
  @Post('profile')
  completeProfile(@Req() req: any, @Body() dto: CompleteProfileDto) {
    return this.service.completeProfile(req.user.sub, dto);
  }
 
  @Patch('traveler-types')
  updateTravelerTypes(@Req() req: any, @Body() dto: UpdateTravelerTypesDto) {
    return this.service.updateTravelerTypes(req.user.sub, dto);
  }
 
  @Patch('motivations')
  updateMotivations(@Req() req: any, @Body() dto: UpdateMotivationsDto) {
    return this.service.updateMotivations(req.user.sub, dto);
  }
 
  @Patch('interests')
  updateInterests(@Req() req: any, @Body() dto: UpdateInterestsDto) {
    return this.service.updateInterests(req.user.sub, dto);
  }
 
  @Patch('goals')
  updateGoals(@Req() req: any, @Body() dto: UpdateGoalsDto) {
    return this.service.updateGoals(req.user.sub, dto);
  }
 
  @Post('onboarded')
  markOnboarded(@Req() req: any) {
    return this.service.markOnboarded(req.user.sub);
  }

  // ── Search ───────────────────────────────────────────────────────────────────
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROVIDER, Role.PROJECT, Role.ADMIN)
  @Get('search')
  searchTravelers(@Req() req: any, @Query('q') q: string) {
    return this.service.searchTravelers(q ?? '', req.user.sub);
  }

  // ── Public profile (requires auth to compute friend status) ─────────────────
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.ADMIN)
  @Get('profile/:userId')
  getPublicProfile(@Req() req: any, @Param('userId') userId: string) {
    return this.service.getPublicProfile(userId, req.user.sub);
  }

  // ── Public friends list of another eco-traveler ──────────────────────────────
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.ADMIN)
  @Get('friends/public/:userId')
  getPublicFriends(@Param('userId') userId: string) {
    return this.service.getPublicFriends(userId);
  }

  // ── Friend requests ──────────────────────────────────────────────────────────
  @Get('friends/requests')
  getPendingRequests(@Req() req: any) {
    return this.service.getPendingRequests(req.user.sub);
  }

  @Get('friends')
  getFriends(@Req() req: any) {
    return this.service.getFriends(req.user.sub);
  }

  @Post('friends/request/:targetId')
  sendFriendRequest(@Req() req: any, @Param('targetId') targetId: string) {
    return this.service.sendFriendRequest(req.user.sub, targetId);
  }

  @Patch('friends/accept/:id')
  acceptFriendRequest(@Req() req: any, @Param('id') id: string) {
    return this.service.acceptFriendRequest(req.user.sub, id);
  }

  @Delete('friends/:id')
  removeFriendship(@Req() req: any, @Param('id') id: string) {
    return this.service.removeFriendship(req.user.sub, id);
  }

  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.ADMIN)
  @Post('block/:targetId')
  blockUser(@Req() req: any, @Param('targetId') targetId: string) {
    return this.service.blockUser(req.user.sub, targetId);
  }

  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.ADMIN)
  @Post('report/:targetId')
  reportUser(@Req() req: any, @Param('targetId') targetId: string, @Body() body: { reason: string }) {
    return this.service.reportUser(req.user.sub, targetId, body.reason ?? '');
  }
}