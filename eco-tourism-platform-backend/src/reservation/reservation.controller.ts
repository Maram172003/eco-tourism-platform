import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { ReservationService } from './reservation.service';
import {
  AvailabilityQueryDto,
  ConfirmReservationDto,
  CreateReservationDto,
  RespondToInvitationDto,
} from './dto/reservation.dto';

@ApiTags('Reservations')
@ApiBearerAuth('bearer')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  @Roles(Role.ECO_TRAVELER, Role.PROVIDER, Role.GUIDE)
  @Get('availability')
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.service.getAvailability(query);
  }

  @Roles(Role.ECO_TRAVELER)
  @Post()
  create(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Roles(Role.ECO_TRAVELER)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.service.findMine(req.user.sub);
  }

  @Roles(Role.ECO_TRAVELER)
  @Get('invitations')
  findPendingInvitations(@Req() req: any) {
    return this.service.findPendingInvitations(req.user.sub);
  }

  @Roles(Role.PROVIDER, Role.GUIDE)
  @Get('provider/received')
  findForProvider(@Req() req: any) {
    return this.service.findForAuthor(req.user.sub);
  }

  @Roles(Role.ECO_TRAVELER, Role.PROVIDER, Role.GUIDE)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ECO_TRAVELER)
  @Patch(':id/respond')
  respond(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RespondToInvitationDto,
  ) {
    return this.service.respondToInvitation(req.user.sub, id, dto);
  }

  @Roles(Role.ECO_TRAVELER)
  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.service.cancelReservation(req.user.sub, id);
  }

  @Roles(Role.PROVIDER, Role.GUIDE)
  @Patch(':id/confirm')
  confirmByProvider(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ConfirmReservationDto,
  ) {
    return this.service.confirmByAuthor(req.user.sub, id, dto);
  }
}
