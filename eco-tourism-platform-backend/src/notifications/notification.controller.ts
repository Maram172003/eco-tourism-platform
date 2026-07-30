import { Controller, Delete, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUser(req.user.sub);
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.service.unreadCount(req.user.sub).then((count) => ({ count }));
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.service.markAllRead(req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markRead(req.user.sub, id);
  }

  @Patch(':id/unread')
  markUnread(@Req() req: any, @Param('id') id: string) {
    return this.service.markUnread(req.user.sub, id);
  }

  @Delete(':id')
  deleteNotification(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteNotification(req.user.sub, id);
  }

  @Patch(':id/report')
  reportNotification(@Req() req: any, @Param('id') id: string) {
    return this.service.reportNotification(req.user.sub, id);
  }
}
