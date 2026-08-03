import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemLike } from './entities/item-like.entity';
import { ItemComment } from './entities/item-comment.entity';
import { ItemCommentLike } from './entities/item-comment-like.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Offer } from '../offer/entities/offer.entity';
import { Circuit } from '../circuit/entities/circuit.entity';
import { Guide } from '../guide/entities/guide.entity';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(ItemLike)         private readonly likeRepo: Repository<ItemLike>,
    @InjectRepository(ItemComment)      private readonly commentRepo: Repository<ItemComment>,
    @InjectRepository(ItemCommentLike)  private readonly commentLikeRepo: Repository<ItemCommentLike>,
    @InjectRepository(EcoTraveler)      private readonly ecoRepo: Repository<EcoTraveler>,
    @InjectRepository(Provider)         private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Offer)            private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Circuit)          private readonly circuitRepo: Repository<Circuit>,
    @InjectRepository(Guide)            private readonly guideRepo: Repository<Guide>,
  ) {}

  async getStats(type: string, targetId: string, viewerId?: string) {
    const [likes, commentsCount, likeRecord] = await Promise.all([
      this.likeRepo.count({ where: { target_type: type, target_id: targetId } }),
      this.commentRepo.count({ where: { target_type: type, target_id: targetId } }),
      viewerId
        ? this.likeRepo.findOne({ where: { target_type: type, target_id: targetId, user_id: viewerId } })
        : Promise.resolve(null),
    ]);
    return { likes, commentsCount, liked: !!likeRecord };
  }

  async toggleLike(type: string, targetId: string, userId: string, userRole: string) {
    await this.assertTargetExists(type, targetId);
    const existing = await this.likeRepo.findOne({ where: { target_type: type, target_id: targetId, user_id: userId } });
    if (existing) {
      await this.likeRepo.remove(existing);
    } else {
      await this.likeRepo.save(this.likeRepo.create({ target_type: type, target_id: targetId, user_id: userId, user_role: userRole }));
    }
    const count = await this.likeRepo.count({ where: { target_type: type, target_id: targetId } });
    return { liked: !existing, count };
  }

  async getLikers(type: string, targetId: string) {
    const rows = await this.likeRepo.find({ where: { target_type: type, target_id: targetId }, order: { created_at: 'DESC' } });
    return Promise.all(rows.map(async (l) => this.getAuthorInfo(l.user_id, l.user_role)));
  }

  async addComment(type: string, targetId: string, authorId: string, authorRole: string, content: string) {
    await this.assertTargetExists(type, targetId);
    const comment = await this.commentRepo.save(
      this.commentRepo.create({ target_type: type, target_id: targetId, author_id: authorId, author_role: authorRole, content, parent_id: null }),
    );
    const author = await this.getAuthorInfo(authorId, authorRole);
    return { ...comment, author, likes_count: 0, liked_by_viewer: false, replies: [] };
  }

  async addReply(commentId: string, authorId: string, authorRole: string, content: string) {
    const parent = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!parent) throw new NotFoundException('Commentaire introuvable.');
    if (parent.parent_id) throw new BadRequestException('Impossible de répondre à une réponse.');
    const reply = await this.commentRepo.save(
      this.commentRepo.create({ target_type: parent.target_type, target_id: parent.target_id, author_id: authorId, author_role: authorRole, content, parent_id: commentId }),
    );
    const author = await this.getAuthorInfo(authorId, authorRole);
    return { ...reply, author, likes_count: 0, liked_by_viewer: false };
  }

  async getComments(type: string, targetId: string, viewerId?: string) {
    const allComments = await this.commentRepo.find({ where: { target_type: type, target_id: targetId }, order: { created_at: 'ASC' } });
    if (!allComments.length) return [];

    const commentIds = allComments.map((c) => c.id);
    const allLikes = commentIds.length
      ? await this.commentLikeRepo.createQueryBuilder('cl').where('cl.comment_id IN (:...ids)', { ids: commentIds }).getMany()
      : [];

    const likeCountMap = new Map<string, number>();
    const viewerLikedMap = new Map<string, boolean>();
    for (const like of allLikes) {
      likeCountMap.set(like.comment_id, (likeCountMap.get(like.comment_id) ?? 0) + 1);
      if (viewerId && like.user_id === viewerId) viewerLikedMap.set(like.comment_id, true);
    }

    const authorMap = new Map<string, any>();
    const uniqueAuthors = [...new Set(allComments.map((c) => `${c.author_id}:${c.author_role}`))];
    await Promise.all(uniqueAuthors.map(async (key) => {
      const [userId, role] = key.split(':');
      authorMap.set(key, await this.getAuthorInfo(userId, role));
    }));

    const enrich = (c: ItemComment, includeReplies = false) => ({
      ...c,
      author: authorMap.get(`${c.author_id}:${c.author_role}`) ?? { user_id: c.author_id, full_name: 'Utilisateur', photo: null, role: c.author_role },
      likes_count: likeCountMap.get(c.id) ?? 0,
      liked_by_viewer: viewerLikedMap.get(c.id) ?? false,
      ...(includeReplies ? { replies: [] as any[] } : {}),
    });

    const topLevel = allComments.filter((c) => !c.parent_id).map((c) => enrich(c, true));
    const replies   = allComments.filter((c) => !!c.parent_id).map((c) => enrich(c, false));
    for (const reply of replies) {
      const parent = topLevel.find((c) => c.id === reply.parent_id);
      if (parent) (parent as any).replies.push(reply);
    }
    return topLevel;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');
    if (comment.author_id !== userId) throw new ForbiddenException('Accès refusé.');
    await this.commentLikeRepo.delete({ comment_id: commentId });
    const replies = await this.commentRepo.find({ where: { parent_id: commentId } });
    if (replies.length) {
      await this.commentLikeRepo.delete({ comment_id: replies.map((r) => r.id) as any });
      await this.commentRepo.delete({ parent_id: commentId });
    }
    await this.commentRepo.remove(comment);
    return { message: 'Commentaire supprimé.', replies_deleted: replies.length };
  }

  async toggleCommentLike(commentId: string, userId: string, userRole: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');
    const existing = await this.commentLikeRepo.findOne({ where: { comment_id: commentId, user_id: userId } });
    if (existing) {
      await this.commentLikeRepo.remove(existing);
    } else {
      await this.commentLikeRepo.save(this.commentLikeRepo.create({ comment_id: commentId, user_id: userId, user_role: userRole }));
    }
    const count = await this.commentLikeRepo.count({ where: { comment_id: commentId } });
    return { liked: !existing, count };
  }

  private async assertTargetExists(type: string, targetId: string) {
    if (type === 'offer') {
      const o = await this.offerRepo.findOne({ where: { id: targetId, status: 'approved' } });
      if (!o) throw new NotFoundException('Offre introuvable.');
    } else if (type === 'circuit') {
      const c = await this.circuitRepo.findOne({ where: { id: targetId, status: 'approved' } });
      if (!c) throw new NotFoundException('Circuit introuvable.');
    } else {
      throw new BadRequestException('Type invalide.');
    }
  }

  private async getAuthorInfo(userId: string, role: string) {
    let entity: any = null;
    if (role === 'eco_traveler') {
      entity = await this.ecoRepo.findOne({ where: { user_id: userId } });
    } else if (role === 'guide') {
      entity = await this.guideRepo.findOne({ where: { user_id: userId } });
    } else {
      entity = await this.providerRepo.findOne({ where: { user_id: userId } });
    }
    return { user_id: userId, full_name: entity?.full_name ?? 'Utilisateur', photo: entity?.photo ?? null, role };
  }
}
