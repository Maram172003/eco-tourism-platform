import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Publication } from './entities/publication.entity';
import { PublicationLike } from './entities/publication-like.entity';
import { PublicationComment } from './entities/publication-comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CreatePublicationDto, UpdatePublicationDto } from './dto/publication.dto';
import { EcoTravelerService } from '../eco-traveler/eco-traveler.service';
import { EcoTravelerMongoService } from '../eco-traveler/eco-traveler-mongo.service';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Follow } from '../follow/entities/follow.entity';
import { Friendship } from '../eco-traveler/entities/friendship.entity';
import { OfferService } from '../offer/offer.service';
import { CircuitService } from '../circuit/circuit.service';
import { ItemLike } from '../interactions/entities/item-like.entity';
import { macrosOfTags } from '../common/constants/taxonomy';

const AMBASSADOR_BADGE = 'Ambassadeur Éco-Voyage';

@Injectable()
export class PublicationService {
  constructor(
    @InjectRepository(Publication)
    private readonly repo: Repository<Publication>,
    @InjectRepository(PublicationLike)
    private readonly likeRepo: Repository<PublicationLike>,
    @InjectRepository(PublicationComment)
    private readonly commentRepo: Repository<PublicationComment>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepo: Repository<CommentLike>,
    @InjectRepository(EcoTraveler)
    private readonly ecoRepo: Repository<EcoTraveler>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly ecoTravelerService: EcoTravelerService,
    private readonly ecoTravelerMongoService: EcoTravelerMongoService,
    @InjectRepository(ItemLike)
    private readonly itemLikeRepo: Repository<ItemLike>,
    private readonly offerService: OfferService,
    private readonly circuitService: CircuitService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(authorId: string, dto: CreatePublicationDto): Promise<Publication> {
    let status = 'approved';
    if (dto.type === 'place') {
      const hasAmbassador = await this.ecoTravelerMongoService.hasBadge(authorId, AMBASSADOR_BADGE);
      status = hasAmbassador ? 'approved' : 'pending';
    }
    const pub = this.repo.create({
      author_id: authorId, type: dto.type, title: dto.title,
      description: dto.description ?? null, images: dto.images?.length ? dto.images : null,
      latitude: dto.latitude ?? null, longitude: dto.longitude ?? null,
      place_name: dto.place_name ?? null, region: dto.region ?? null, status,
    });
    const saved = await this.repo.save(pub);
    await this.syncPartagesScore(authorId);
    return saved;
  }

  async findByAuthor(authorId: string): Promise<Publication[]> {
    return this.repo.find({ where: { author_id: authorId }, order: { created_at: 'DESC' } });
  }

  async findPublicByAuthor(authorId: string): Promise<Publication[]> {
    return this.repo.find({ where: { author_id: authorId, status: 'approved' }, order: { created_at: 'DESC' } });
  }

  async findAllExperiences(): Promise<Publication[]> {
    return this.repo.find({ where: { type: 'experience', status: 'approved' }, order: { created_at: 'DESC' }, take: 12 });
  }

  async update(authorId: string, pubId: string, dto: UpdatePublicationDto): Promise<Publication> {
    const pub = await this.findOrFail(pubId);
    if (pub.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    if (dto.title !== undefined) pub.title = dto.title;
    if (dto.description !== undefined) pub.description = dto.description;
    if (dto.images !== undefined) pub.images = dto.images.length ? dto.images : null;
    if (dto.place_name !== undefined) pub.place_name = dto.place_name;
    if (dto.region !== undefined) pub.region = dto.region;
    return this.repo.save(pub);
  }

  async remove(authorId: string, pubId: string): Promise<{ message: string }> {
    const pub = await this.findOrFail(pubId);
    if (pub.author_id !== authorId) throw new ForbiddenException('Accès refusé.');
    await this.likeRepo.delete({ publication_id: pubId });
    const comments = await this.commentRepo.find({ where: { publication_id: pubId } });
    if (comments.length) {
      await this.commentLikeRepo.delete({ comment_id: comments.map(c => c.id) as any });
      await this.commentRepo.delete({ publication_id: pubId });
    }
    await this.repo.remove(pub);
    await this.syncPartagesScore(authorId);
    return { message: 'Publication supprimée.' };
  }

  // ─── Publication Likes ────────────────────────────────────────────────────

  async toggleLike(pubId: string, userId: string, userRole: string) {
    await this.findOrFail(pubId);
    const existing = await this.likeRepo.findOne({ where: { publication_id: pubId, user_id: userId } });
    if (existing) {
      await this.likeRepo.remove(existing);
    } else {
      await this.likeRepo.save(this.likeRepo.create({ publication_id: pubId, user_id: userId, user_role: userRole }));
    }
    const count = await this.likeRepo.count({ where: { publication_id: pubId } });
    return { liked: !existing, count };
  }

  async getInteractions(pubId: string, viewerId?: string) {
    const [likes, commentsCount, likeRecord] = await Promise.all([
      this.likeRepo.count({ where: { publication_id: pubId } }),
      this.commentRepo.count({ where: { publication_id: pubId } }),
      viewerId ? this.likeRepo.findOne({ where: { publication_id: pubId, user_id: viewerId } }) : Promise.resolve(null),
    ]);
    return { likes, commentsCount, liked: !!likeRecord };
  }

  async getBatchInteractions(pubIds: string[], viewerId?: string) {
    const result: Record<string, { likes: number; commentsCount: number; liked: boolean }> = {};
    await Promise.all(pubIds.map(async (id) => { result[id] = await this.getInteractions(id, viewerId); }));
    return result;
  }

  async getLikers(pubId: string) {
    const rows = await this.likeRepo.find({ where: { publication_id: pubId }, order: { created_at: 'DESC' } });
    return Promise.all(rows.map(async (l) => ({ ...(await this.getAuthorInfo(l.user_id, l.user_role)), liked_at: l.created_at })));
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async addComment(pubId: string, authorId: string, authorRole: string, content: string) {
    await this.findOrFail(pubId);
    const comment = await this.commentRepo.save(
      this.commentRepo.create({ publication_id: pubId, author_id: authorId, author_role: authorRole, content, parent_id: null }),
    );
    const author = await this.getAuthorInfo(authorId, authorRole);
    return { ...comment, author, likes_count: 0, liked_by_viewer: false, replies: [] };
  }

  async addReply(commentId: string, authorId: string, authorRole: string, content: string) {
    const parent = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!parent) throw new NotFoundException('Commentaire introuvable.');
    if (parent.parent_id) throw new BadRequestException('Impossible de répondre à une réponse.');
    const reply = await this.commentRepo.save(
      this.commentRepo.create({ publication_id: parent.publication_id, author_id: authorId, author_role: authorRole, content, parent_id: commentId }),
    );
    const author = await this.getAuthorInfo(authorId, authorRole);
    return { ...reply, author, likes_count: 0, liked_by_viewer: false };
  }

  async getComments(pubId: string, viewerId?: string) {
    const allComments = await this.commentRepo.find({ where: { publication_id: pubId }, order: { created_at: 'ASC' } });
    if (!allComments.length) return [];

    // Batch-load all comment likes for this publication
    const commentIds = allComments.map((c) => c.id);
    const allLikes = commentIds.length
      ? await this.commentLikeRepo
          .createQueryBuilder('cl')
          .where('cl.comment_id IN (:...ids)', { ids: commentIds })
          .getMany()
      : [];

    // Build lookup maps
    const likeCountMap = new Map<string, number>();
    const viewerLikedMap = new Map<string, boolean>();
    for (const like of allLikes) {
      likeCountMap.set(like.comment_id, (likeCountMap.get(like.comment_id) ?? 0) + 1);
      if (viewerId && like.user_id === viewerId) viewerLikedMap.set(like.comment_id, true);
    }

    // Batch-load unique authors
    const authorMap = new Map<string, any>();
    const uniqueAuthors = [...new Set(allComments.map((c) => `${c.author_id}:${c.author_role}`))];
    await Promise.all(uniqueAuthors.map(async (key) => {
      const [userId, role] = key.split(':');
      authorMap.set(key, await this.getAuthorInfo(userId, role));
    }));

    const enrich = (c: PublicationComment, includeReplies = false) => ({
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
    // Delete likes and replies first
    await this.commentLikeRepo.delete({ comment_id: commentId });
    const replies = await this.commentRepo.find({ where: { parent_id: commentId } });
    if (replies.length) {
      await this.commentLikeRepo.delete({ comment_id: replies.map((r) => r.id) as any });
      await this.commentRepo.delete({ parent_id: commentId });
    }
    await this.commentRepo.remove(comment);
    return { message: 'Commentaire supprimé.', replies_deleted: replies.length };
  }

  // ─── Comment Likes ────────────────────────────────────────────────────────

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

  // ─── Explorer feed ────────────────────────────────────────────────────────

  async getFeedEcoTraveler(userId: string): Promise<{ items: any[] }> {
    const follows = await this.followRepo.find({ where: { follower_id: userId, status: 'accepted' } });
    const followingIds = follows.map((f) => f.following_id);

    const friendships = await this.friendshipRepo.find({
      where: [
        { requester_id: userId, status: 'accepted' },
        { receiver_id: userId, status: 'accepted' },
      ],
    });
    const friendIds = friendships.map((f) =>
      f.requester_id === userId ? f.receiver_id : f.requester_id,
    );

    const pubAuthorIds = [...new Set([...friendIds, ...followingIds])];
    const publications = pubAuthorIds.length > 0
      ? await this.repo.find({
          where: { author_id: In(pubAuthorIds), status: 'approved' },
          order: { created_at: 'DESC' },
        })
      : [];

    const enrichedPubs = await Promise.all(
      publications.map(async (pub) => {
        const author = await this.getAuthorInfo(pub.author_id, 'eco_traveler');
        return { ...pub, author };
      }),
    );

    const [offers, circuits] = await Promise.all([
      this.offerService.findFollowingsOffers(followingIds),
      this.circuitService.findFollowingsCircuits(followingIds),
    ]);

    const items = [
      ...enrichedPubs.map((p) => ({ type: 'publication', id: p.id, created_at: p.created_at, data: p })),
      ...offers.map((o) => ({ type: 'offer', id: o.id, created_at: o.created_at, data: o })),
      ...circuits.map((c) => ({ type: 'circuit', id: c.id, created_at: c.created_at, data: c })),
    ].sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

    return { items };
  }

  async getFeedPro(userId: string): Promise<{ items: any[] }> {
    const follows = await this.followRepo.find({ where: { follower_id: userId, status: 'accepted' } });
    const followingIds = follows.map((f) => f.following_id);

    const [offers, circuits] = await Promise.all([
      this.offerService.findFollowingsOffers(followingIds),
      this.circuitService.findFollowingsCircuits(followingIds),
    ]);

    const items = [
      ...offers.map((o) => ({ type: 'offer', id: o.id, created_at: o.created_at, data: o })),
      ...circuits.map((c) => ({ type: 'circuit', id: c.id, created_at: c.created_at, data: c })),
    ].sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

    return { items };
  }

  // ─── Recommendations ──────────────────────────────────────────────────────

  async getRecommendations(userId: string, userRole: string): Promise<{ items: any[]; mode: 'tagged' | 'recent' }> {
    const [offers, circuits] = await Promise.all([
      this.offerService.findAllApprovedForRecommendations(),
      this.circuitService.findAllApprovedForRecommendations(),
    ]);

    if (userRole === 'eco_traveler') {
      const traveler = await this.ecoRepo.findOne({ where: { user_id: userId } });
      const interests: string[] = traveler?.interests ?? [];
      // Les univers choisis à l'onboarding (« motivations ») sont des
      // macro-catégories. Ils permettent de recommander un hébergement à qui
      // s'intéresse à l'hébergement, sans lui demander de cocher « suite » ou
      // « chambre standard » — ce qui n'aurait aucun sens comme centre d'intérêt.
      const macros: string[] = traveler?.motivations ?? [];

      if (interests.length > 0 || macros.length > 0) {
        const interestSet = new Set(interests);
        const macroSet = new Set(macros);

        // Un tag fin coché compte double : c'est un signal plus précis
        // qu'un simple univers d'intérêt.
        const score = (tags: string[]): number => {
          const list = tags ?? [];
          const exact = list.filter(t => interestSet.has(t)).length * 2;
          const byMacro = [...macrosOfTags(list)].filter(m => macroSet.has(m)).length;
          return exact + byMacro;
        };

        const scored = [
          ...offers.map(o => ({ type: 'offer' as const, id: o.id, created_at: o.created_at, matchScore: score(o.tags ?? []), data: o })),
          ...circuits.map(c => ({ type: 'circuit' as const, id: c.id, created_at: c.created_at, matchScore: score(c.tags ?? []), data: c })),
        ]
          .filter(item => item.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        return { items: scored, mode: 'tagged' };
      }
    }

    // Guide, Provider, ou éco-voyageur sans intérêts → top 10 les plus likés
    const likesRows = await this.itemLikeRepo
      .createQueryBuilder('il')
      .select('il.target_id', 'target_id')
      .addSelect('COUNT(*)', 'count')
      .where('il.target_type IN (:...types)', { types: ['offer', 'circuit'] })
      .groupBy('il.target_id')
      .getRawMany<{ target_id: string; count: string }>();

    const likesMap = new Map(likesRows.map(r => [r.target_id, parseInt(r.count, 10)]));

    const popular = [
      ...offers.map(o => ({ type: 'offer' as const, id: o.id, created_at: o.created_at, matchScore: 0, likesCount: likesMap.get(o.id) ?? 0, data: o })),
      ...circuits.map(c => ({ type: 'circuit' as const, id: c.id, created_at: c.created_at, matchScore: 0, likesCount: likesMap.get(c.id) ?? 0, data: c })),
    ]
      .sort((a, b) => b.likesCount - a.likesCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return { items: popular, mode: 'recent' };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findOrFail(id: string): Promise<Publication> {
    const pub = await this.repo.findOne({ where: { id } });
    if (!pub) throw new NotFoundException('Publication introuvable.');
    return pub;
  }

  private async getAuthorInfo(userId: string, role: string) {
    let entity: any = null;
    if (role === 'eco_traveler') entity = await this.ecoRepo.findOne({ where: { user_id: userId } });
    else entity = await this.providerRepo.findOne({ where: { user_id: userId } });
    return { user_id: userId, full_name: entity?.full_name ?? 'Utilisateur', photo: entity?.photo ?? null, role };
  }

  private async syncPartagesScore(authorId: string): Promise<void> {
    try {
      const count = await this.repo.count({ where: { author_id: authorId } });
      const score = Math.min(count * 20, 100);
      await this.ecoTravelerService.updateScoreComponent(authorId, 'partages', score);
    } catch { }
  }
}
