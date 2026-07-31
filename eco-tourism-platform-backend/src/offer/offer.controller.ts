import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { OfferService } from './offer.service';
import { CreateOfferDto, OfferSustainabilityDto, UpdateOfferDto } from './dto/offer.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Offers')
@Controller('offers')
export class OfferController {
  constructor(private readonly service: OfferService) {}

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Post()
  create(@Req() req: any, @Body() dto: CreateOfferDto) {
    return this.service.create(req.user.sub, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.service.findByAuthor(req.user.sub);
  }

  @Public()
  @Get()
  findAllPublic() {
    return this.service.findAllPublic();
  }

  @Public()
  @Get('author/:authorId')
  findByAuthor(@Param('authorId') authorId: string) {
    return this.service.findPublishedByAuthor(authorId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Get('organization/:orgId/mine')
  findByOrgMine(@Req() req: any, @Param('orgId') orgId: string) {
    return this.service.findByOrganization(orgId);
  }

  @Public()
  @Get('organization/:orgId')
  findByOrg(@Param('orgId') orgId: string) {
    return this.service.findPublishedByOrganization(orgId);
  }

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Patch(':id/sustainability')
  updateSustainability(@Req() req: any, @Param('id') id: string, @Body() dto: OfferSustainabilityDto) {
    return this.service.updateOfferSustainability(req.user.sub, id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.service.update(req.user.sub, id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.sub, id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Post(':id/publish')
  publishOffer(@Req() req: any, @Param('id') id: string) {
    return this.service.publishOffer(req.user.sub, id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Post(':offerId/collab-conflicts')
  checkCollabConflicts(@Req() req: any, @Param('offerId') offerId: string, @Body('disponibilite') disponibilite: any) {
    return this.service.checkCollabConflicts(req.user.sub, offerId, disponibilite);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  @Public()
  @Get(':offerId/sessions')
  getSessions(@Param('offerId') offerId: string) {
    return this.service.getSessionsForOffer(offerId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Post(':offerId/sessions')
  createSession(@Req() req: any, @Param('offerId') offerId: string, @Body() dto: any) {
    return this.service.createSession(req.user.sub, offerId, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Patch('sessions/:sessionId')
  updateSession(@Req() req: any, @Param('sessionId') sessionId: string, @Body() dto: any) {
    return this.service.updateSession(req.user.sub, sessionId, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.PROVIDER)
  @Delete('sessions/:sessionId')
  deleteSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    return this.service.deleteSession(req.user.sub, sessionId);
  }
}
