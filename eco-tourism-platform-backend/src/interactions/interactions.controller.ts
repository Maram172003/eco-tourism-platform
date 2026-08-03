import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { InteractionsService } from './interactions.service';

const ALL_ROLES = [Role.ECO_TRAVELER, Role.GUIDE, Role.PROVIDER, Role.PROJECT, Role.ADMIN];

@ApiTags('Interactions')
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly service: InteractionsService) {}

  // ─── Comment Likes & Replies (specific routes FIRST to avoid collision with :type/:id) ──

  @ApiBearerAuth('bearer') @Roles(...ALL_ROLES)
  @Post('comments/:commentId/like')
  toggleCommentLike(@Req() req: any, @Param('commentId') commentId: string) {
    return this.service.toggleCommentLike(commentId, req.user.sub, req.user.role);
  }

  @ApiBearerAuth('bearer') @Roles(...ALL_ROLES)
  @Post('comments/:commentId/reply')
  addReply(@Req() req: any, @Param('commentId') commentId: string, @Body('content') content: string) {
    return this.service.addReply(commentId, req.user.sub, req.user.role, content);
  }

  @ApiBearerAuth('bearer') @Roles(...ALL_ROLES)
  @Delete('comments/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.service.deleteComment(commentId, req.user.sub);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Public()
  @Get(':type/:id/interactions')
  getStats(@Param('type') type: string, @Param('id') id: string, @Query('viewer') viewer?: string) {
    return this.service.getStats(type, id, viewer);
  }

  // ─── Likes ────────────────────────────────────────────────────────────────

  @Public()
  @Get(':type/:id/likes')
  getLikers(@Param('type') type: string, @Param('id') id: string) {
    return this.service.getLikers(type, id);
  }

  @ApiBearerAuth('bearer') @Roles(...ALL_ROLES)
  @Post(':type/:id/like')
  toggleLike(@Req() req: any, @Param('type') type: string, @Param('id') id: string) {
    return this.service.toggleLike(type, id, req.user.sub, req.user.role);
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  @Public()
  @Get(':type/:id/comments')
  getComments(@Param('type') type: string, @Param('id') id: string, @Query('viewer') viewer?: string) {
    return this.service.getComments(type, id, viewer);
  }

  @ApiBearerAuth('bearer') @Roles(...ALL_ROLES)
  @Post(':type/:id/comments')
  addComment(@Req() req: any, @Param('type') type: string, @Param('id') id: string, @Body('content') content: string) {
    return this.service.addComment(type, id, req.user.sub, req.user.role, content);
  }
}
