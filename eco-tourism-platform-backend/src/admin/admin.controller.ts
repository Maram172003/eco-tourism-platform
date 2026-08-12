import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { AdminService } from './admin.service';
import { RejectDto } from './dto/admin.dto';
import { ReportsService } from '../reports/reports.service';

@ApiTags('Admin')
@ApiBearerAuth('bearer')
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly reportsService: ReportsService,
  ) {}

  // ─── Publications ─────────────────────────────────────────────────────────

  @Get('publications/pending')
  getPendingPublications() {
    return this.service.getPendingPublications();
  }

  @Patch('publications/:id/approve')
  approvePublication(@Param('id') id: string) {
    return this.service.approvePublication(id);
  }

  @Patch('publications/:id/reject')
  rejectPublication(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.service.rejectPublication(id, dto.reason);
  }

  // ─── Offers ───────────────────────────────────────────────────────────────

  @Get('offers/pending')
  getPendingOffers() {
    return this.service.getPendingOffers();
  }

  @Patch('offers/:id/approve')
  approveOffer(@Param('id') id: string) {
    return this.service.approveOffer(id);
  }

  @Patch('offers/:id/reject')
  rejectOffer(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.service.rejectOffer(id, dto.reason);
  }

  // ─── Providers ────────────────────────────────────────────────────────────

  @Get('providers/pending')
  getPendingProviders() {
    return this.service.getPendingProviders();
  }

  @Patch('providers/:userId/approve')
  approveProvider(@Param('userId') userId: string) {
    return this.service.approveProvider(userId);
  }

  @Patch('providers/:userId/reject')
  rejectProvider(@Param('userId') userId: string, @Body() dto: RejectDto) {
    return this.service.rejectProvider(userId, dto.reason);
  }

  // ─── Guides ───────────────────────────────────────────────────────────────

  @Get('guides/pending')
  getPendingGuides() {
    return this.service.getPendingGuides();
  }

  @Patch('guides/:userId/approve')
  approveGuide(@Param('userId') userId: string) {
    return this.service.approveGuide(userId);
  }

  @Patch('guides/:userId/reject')
  rejectGuide(@Param('userId') userId: string, @Body() dto: RejectDto) {
    return this.service.rejectGuide(userId, dto.reason);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('reports')
  getReports() {
    return this.reportsService.getAllReports();
  }

  @Patch('reports/:id/resolve')
  resolveReport(
    @Param('id') id: string,
    @Body() body: { action: string; note?: string; ban_days?: number },
  ) {
    return this.reportsService.resolveReport(id, body.action, body.note ?? '', body.ban_days);
  }

  // ─── Ban management ───────────────────────────────────────────────────────

  @Get('users/banned')
  getBannedUsers() {
    return this.service.getBannedUsers();
  }

  @Patch('users/:id/ban')
  updateBan(@Param('id') id: string, @Body() body: { ban_days?: number; note?: string }) {
    return this.service.updateBan(id, body.ban_days, body.note);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.service.unbanUser(id);
  }
}
