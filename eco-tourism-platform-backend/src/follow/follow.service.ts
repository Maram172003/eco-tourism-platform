import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { Provider } from '../provider/entities/provider.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Guide } from '../guide/entities/guide.entity';

// Combinaisons autorisées : follower_type → following_type
const ALLOWED: Array<[string, string]> = [
  ['eco_traveler', 'provider'],
  ['eco_traveler', 'guide'],
  ['provider', 'provider'],
  ['provider', 'guide'],
  ['guide', 'provider'],
  ['guide', 'guide'],
];

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow)
    private readonly repo: Repository<Follow>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(EcoTraveler)
    private readonly ecoRepo: Repository<EcoTraveler>,
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,
  ) {}

  // ── Récupère le profil enrichi d'un utilisateur selon son rôle ──────────────
  private async getProfile(userId: string, role: string) {
    if (role === 'eco_traveler') {
      const t = await this.ecoRepo.findOne({ where: { user_id: userId } });
      return { user_id: userId, full_name: t?.full_name ?? null, photo: t?.photo ?? null, role };
    }
    if (role === 'guide') {
      const g = await this.guideRepo.findOne({ where: { user_id: userId } });
      return { user_id: userId, full_name: g?.full_name ?? null, photo: g?.photo ?? null, role };
    }
    const p = await this.providerRepo.findOne({ where: { user_id: userId } });
    return { user_id: userId, full_name: p?.full_name ?? null, photo: p?.photo ?? null, role };
  }

  // ── Envoyer une demande de suivi ─────────────────────────────────────────────
  async follow(followerId: string, followerType: string, followingId: string, followingType: string) {
    if (followerId === followingId) throw new BadRequestException('Action invalide.');

    const isAllowed = ALLOWED.some(([ft, gt]) => ft === followerType && gt === followingType);
    if (!isAllowed) throw new BadRequestException('Cette relation de suivi n\'est pas autorisée.');

    const existing = await this.repo.findOne({ where: { follower_id: followerId, following_id: followingId } });
    if (existing) {
      if (existing.status === 'pending') throw new BadRequestException('Demande déjà envoyée.');
      if (existing.status === 'accepted') throw new BadRequestException('Vous suivez déjà cet utilisateur.');
    }

    const follow = this.repo.create({
      follower_id: followerId,
      follower_type: followerType,
      following_id: followingId,
      following_type: followingType,
      status: 'pending',
    });
    return this.repo.save(follow);
  }

  // ── Accepter une demande reçue ───────────────────────────────────────────────
  async acceptFollow(userId: string, followId: string) {
    const follow = await this.repo.findOne({ where: { id: followId } });
    if (!follow) throw new NotFoundException('Demande introuvable.');
    if (follow.following_id !== userId) throw new ForbiddenException('Accès refusé.');
    if (follow.status === 'accepted') throw new BadRequestException('Déjà accepté.');
    follow.status = 'accepted';
    return this.repo.save(follow);
  }

  // ── Refuser ou annuler une demande ───────────────────────────────────────────
  async rejectFollow(userId: string, followId: string) {
    const follow = await this.repo.findOne({ where: { id: followId } });
    if (!follow) throw new NotFoundException('Demande introuvable.');
    // Le destinataire peut refuser, l'expéditeur peut annuler
    if (follow.following_id !== userId && follow.follower_id !== userId) throw new ForbiddenException('Accès refusé.');
    await this.repo.remove(follow);
    return { message: 'Demande supprimée.' };
  }

  // ── Se désabonner d'un utilisateur ──────────────────────────────────────────
  async unfollow(followerId: string, followingId: string) {
    const follow = await this.repo.findOne({ where: { follower_id: followerId, following_id: followingId } });
    if (!follow) throw new NotFoundException('Vous ne suivez pas cet utilisateur.');
    await this.repo.remove(follow);
    return { message: 'Désabonné.' };
  }

  // ── Demandes reçues en attente (moi = following) ─────────────────────────────
  async getPendingRequests(userId: string) {
    const rows = await this.repo.find({
      where: { following_id: userId, status: 'pending' },
      order: { created_at: 'DESC' },
    });
    return Promise.all(rows.map(async (r) => ({
      id: r.id,
      created_at: r.created_at,
      sender: await this.getProfile(r.follower_id, r.follower_type),
    })));
  }

  // ── Demandes envoyées en attente (moi = follower) ────────────────────────────
  async getSentRequests(userId: string) {
    const rows = await this.repo.find({
      where: { follower_id: userId, status: 'pending' },
      order: { created_at: 'DESC' },
    });
    return Promise.all(rows.map(async (r) => ({
      id: r.id,
      created_at: r.created_at,
      target: await this.getProfile(r.following_id, r.following_type),
    })));
  }

  // ── Liste des follows acceptés (IDs bruts) ───────────────────────────────────
  async getFollowing(followerId: string) {
    return this.repo.find({ where: { follower_id: followerId, status: 'accepted' }, order: { created_at: 'DESC' } });
  }

  async getFollowers(followingId: string) {
    return this.repo.find({ where: { following_id: followingId, status: 'accepted' }, order: { created_at: 'DESC' } });
  }

  // ── Listes enrichies avec profils ────────────────────────────────────────────
  async getFollowingWithProfiles(followerId: string) {
    const rows = await this.repo.find({ where: { follower_id: followerId, status: 'accepted' }, order: { created_at: 'DESC' } });
    return Promise.all(rows.map((r) => this.getProfile(r.following_id, r.following_type)));
  }

  async getFollowersWithProfiles(followingId: string) {
    const rows = await this.repo.find({ where: { following_id: followingId, status: 'accepted' }, order: { created_at: 'DESC' } });
    return Promise.all(rows.map((r) => this.getProfile(r.follower_id, r.follower_type)));
  }

  async getFollowersOfUserWithProfiles(targetId: string) {
    const rows = await this.repo.find({ where: { following_id: targetId, status: 'accepted' }, order: { created_at: 'DESC' } });
    return Promise.all(rows.map((r) => this.getProfile(r.follower_id, r.follower_type)));
  }

  // ── Statut de la relation entre moi et un utilisateur ───────────────────────
  async getFollowStatus(followerId: string, followingId: string) {
    const follow = await this.repo.findOne({ where: { follower_id: followerId, following_id: followingId } });
    return {
      following: follow?.status === 'accepted',
      pending: follow?.status === 'pending',
      followId: follow?.id ?? null,
    };
  }

  async getFollowerCount(followingId: string): Promise<number> {
    return this.repo.count({ where: { following_id: followingId, status: 'accepted' } });
  }

  // ── Retirer un follower accepté ──────────────────────────────────────────────
  async removeFollower(followingId: string, followerId: string) {
    const follow = await this.repo.findOne({ where: { follower_id: followerId, following_id: followingId } });
    if (!follow) throw new NotFoundException('Relation introuvable.');
    await this.repo.remove(follow);
    return { message: 'Abonné retiré.' };
  }
}
