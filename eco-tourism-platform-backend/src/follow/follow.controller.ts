import { Controller, Post, Delete, Get, Patch, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@ApiTags('Follow')
@ApiBearerAuth('bearer')
@Controller('follows')
export class FollowController {
  constructor(private readonly service: FollowService) {}

  /** Envoyer une demande de suivi */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Post(':targetId/:targetType')
  follow(@Req() req: any, @Param('targetId') targetId: string, @Param('targetType') targetType: string) {
    return this.service.follow(req.user.sub, req.user.role, targetId, targetType);
  }

  /** Accepter une demande reçue */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Patch(':id/accept')
  accept(@Req() req: any, @Param('id') id: string) {
    return this.service.acceptFollow(req.user.sub, id);
  }

  /** Refuser ou annuler une demande */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Delete(':id/reject')
  reject(@Req() req: any, @Param('id') id: string) {
    return this.service.rejectFollow(req.user.sub, id);
  }

  /** Se désabonner */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Delete(':targetId')
  unfollow(@Req() req: any, @Param('targetId') targetId: string) {
    return this.service.unfollow(req.user.sub, targetId);
  }

  /** Demandes de suivi reçues (en attente) */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('requests')
  getPendingRequests(@Req() req: any) {
    return this.service.getPendingRequests(req.user.sub);
  }

  /** Demandes de suivi envoyées (en attente) */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('requests/sent')
  getSentRequests(@Req() req: any) {
    return this.service.getSentRequests(req.user.sub);
  }

  /** Qui je suis (IDs bruts, acceptés) */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('following')
  getFollowing(@Req() req: any) {
    return this.service.getFollowing(req.user.sub);
  }

  /** Qui me suit (IDs bruts, acceptés) */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('followers')
  getFollowers(@Req() req: any) {
    return this.service.getFollowers(req.user.sub);
  }

  /** Nombre de followers */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('count')
  getFollowerCount(@Req() req: any) {
    return this.service.getFollowerCount(req.user.sub);
  }

  /** Statut de la relation avec un utilisateur */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('status/:targetId')
  getStatus(@Req() req: any, @Param('targetId') targetId: string) {
    return this.service.getFollowStatus(req.user.sub, targetId);
  }

  /** Qui je suis avec profils enrichis */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('following/profiles')
  getFollowingProfiles(@Req() req: any) {
    return this.service.getFollowingWithProfiles(req.user.sub);
  }

  /** Qui me suit avec profils enrichis */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Get('followers/profiles')
  getFollowersProfiles(@Req() req: any) {
    return this.service.getFollowersWithProfiles(req.user.sub);
  }

  /** Retirer un follower */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER)
  @Delete('follower/:followerId')
  removeFollower(@Req() req: any, @Param('followerId') followerId: string) {
    return this.service.removeFollower(req.user.sub, followerId);
  }

  /** Followers publics d'un utilisateur */
  @Roles(Role.ECO_TRAVELER, Role.GUIDE, Role.PROJECT, Role.PROVIDER, Role.ADMIN)
  @Get('followers/public/:userId')
  getFollowersOfUser(@Param('userId') userId: string) {
    return this.service.getFollowersOfUserWithProfiles(userId);
  }
}
