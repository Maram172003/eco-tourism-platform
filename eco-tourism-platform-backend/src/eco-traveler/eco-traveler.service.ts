import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Or, Repository } from 'typeorm';
import { EcoTraveler } from './entities/eco-traveler.entity';
import { Friendship } from './entities/friendship.entity';
import { Publication } from '../publication/entities/publication.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import {
  CompleteProfileDto,
  UpdateGoalsDto,
  UpdateInterestsDto,
  UpdateMotivationsDto,
  UpdateTravelerTypesDto,
} from './dto/eco-traveler.dto';
import { EcoTravelerMongoService } from './eco-traveler-mongo.service';
import { BadgeService } from '../badge/badge.service';
import { ReportsService } from '../reports/reports.service';
import { ligne, lignePartielle, totalCompletion, type LigneCompletion } from '../common/completion.util';

@Injectable()
export class EcoTravelerService {
  constructor(
    @InjectRepository(EcoTraveler)
    private readonly repo: Repository<EcoTraveler>,
    @InjectRepository(Publication)
    private readonly pubRepo: Repository<Publication>,
    @InjectRepository(Friendship)
    private readonly friendRepo: Repository<Friendship>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly mongoService: EcoTravelerMongoService,
    private readonly badgeService: BadgeService,
    private readonly reportsService: ReportsService,
  ) { }

  async getProfile(userId: string) {
    // Les 4 requêtes partent en parallèle
    const [sqlProfile, mongoPrefs, mongoEngagement, pubCount] = await Promise.all([
      this.repo.findOne({ where: { user_id: userId } }),
      this.mongoService.getPreferences(userId),
      this.mongoService.getEngagement(userId),
      this.pubRepo.count({ where: { author_id: userId } }),
    ]);

    // Recalcule et sauvegarde la completion + score_partages si nécessaire
    if (sqlProfile) {
      let dirty = false;

      const freshCompletion = this.calculateCompletion(sqlProfile);
      if (freshCompletion !== sqlProfile.profile_completion) {
        sqlProfile.profile_completion = freshCompletion;
        dirty = true;
      }

      const freshPartages = Math.min(pubCount * 20, 100);
      if (freshPartages !== sqlProfile.score_partages) {
        sqlProfile.score_partages = freshPartages;
        dirty = true;
      }

      // Même principe pour les réservations, qui restent affichées dans la
      // ventilation même si elles ne pilotent plus le score final.
      const freshReservations = await this.calculerScoreReservations(userId);
      if (freshReservations !== sqlProfile.score_reservations) {
        sqlProfile.score_reservations = freshReservations;
        dirty = true;
      }

      // Le score de durabilité se déduit désormais de la progression dans
      // l'échelle de badges : le questionnaire donne le départ, les paliers
      // prennent le relais. On le rafraîchit ici pour que le profil et le
      // tableau de bord n'affichent jamais une valeur d'un chargement de retard.
      try {
        const stats = await this.badgeService.getStats(userId, 'eco_traveler');
        if (stats.sustainability_score !== sqlProfile.sustainability_score) {
          sqlProfile.sustainability_score = stats.sustainability_score;
          dirty = true;
        }
      } catch { /* le score reste celui déjà enregistré */ }

      if (dirty) {
        await this.repo.save(sqlProfile);
        await this.mongoService.updateScore(userId, sqlProfile.sustainability_score ?? 0);
      }
    }

    return {
      // ── PostgreSQL : source de vérité ──────────────────────────────
      user_id: sqlProfile?.user_id,
      full_name: sqlProfile?.full_name,
      bio: sqlProfile?.bio,
      country: sqlProfile?.country,
      language: sqlProfile?.language,
      photo: sqlProfile?.photo,
      cover_photo: sqlProfile?.cover_photo,
      traveler_types: sqlProfile?.traveler_types,
      motivations: sqlProfile?.motivations,
      sustainability_values: sqlProfile?.sustainability_values,
      interests: sqlProfile?.interests,
      landscapes: sqlProfile?.landscapes,
      travel_styles: sqlProfile?.travel_styles,
      sustainability_goals: sqlProfile?.sustainability_goals,
      sustainability_score: sqlProfile?.sustainability_score,
      score_questionnaire: sqlProfile?.score_questionnaire ?? null,
      score_reservations: sqlProfile?.score_reservations ?? 0,
      score_feedbacks: sqlProfile?.score_feedbacks ?? 0,
      score_partages: sqlProfile?.score_partages ?? 0,
      profile_completion: sqlProfile?.profile_completion,
      completion_details: sqlProfile ? this.lignesCompletion(sqlProfile) : [],
      is_onboarded: sqlProfile?.is_onboarded,

      // ── MongoDB preferences : unique à cette source ─────────────────
      // (interests/landscapes/motivations/goals déjà dans SQL → pas répétés)
      updated_by_behavior: mongoPrefs?.updated_by_behavior ?? false,

      // ── MongoDB engagement : unique à cette source ──────────────────
      // (durability_score déjà dans SQL comme sustainability_score → pas répété)
      badges: mongoEngagement?.badges ?? [],
      feedback_given: mongoEngagement?.feedback_given ?? 0,
      plans_shared: mongoEngagement?.plans_shared ?? 0,
      reservations_made: mongoEngagement?.reservations_made ?? 0,
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    let profile = await this.repo.findOne({ where: { user_id: userId } });

    if (!profile) {
      profile = this.repo.create({ user_id: userId });
      await this.mongoService.initEngagement(userId);
    }

    profile.full_name = dto.full_name;
    profile.bio = dto.bio ?? null;
    profile.country = dto.country ?? null;
    profile.language = dto.language ?? null;
    if (dto.photo !== undefined) profile.photo = dto.photo ?? null;
    if (dto.cover_photo !== undefined) profile.cover_photo = dto.cover_photo ?? null;
    profile.profile_completion = this.calculateCompletion(profile);

    return await this.repo.save(profile);
  }

  async updateTravelerTypes(userId: string, dto: UpdateTravelerTypesDto) {
    const profile = await this.findOrFail(userId);
    profile.traveler_types = dto.traveler_types;
    profile.profile_completion = this.calculateCompletion(profile);

    return await this.repo.save(profile);
  }

  async updateMotivations(userId: string, dto: UpdateMotivationsDto) {
    const profile = await this.findOrFail(userId);
    profile.motivations = dto.motivations;
    profile.sustainability_values = dto.sustainability_values;
    profile.profile_completion = this.calculateCompletion(profile);

    const saved = await this.repo.save(profile);

    await this.mongoService.syncPreferencesFromProfile(userId, {
      motivations: dto.motivations,
    });

    return saved;
  }

  async updateInterests(userId: string, dto: UpdateInterestsDto) {
    const profile = await this.findOrFail(userId);
    profile.interests = dto.interests;
    profile.landscapes = dto.landscapes;
    profile.travel_styles = dto.travel_styles ?? null;
    profile.profile_completion = this.calculateCompletion(profile);

    const saved = await this.repo.save(profile);

    await this.mongoService.syncPreferencesFromProfile(userId, {
      interests: dto.interests,
      landscapes: dto.landscapes,
    });

    return saved;
  }

  async updateGoals(userId: string, dto: UpdateGoalsDto) {
    const profile = await this.findOrFail(userId);
    profile.sustainability_goals = dto.sustainability_goals;
    profile.profile_completion = this.calculateCompletion(profile);

    const saved = await this.repo.save(profile);

    await this.mongoService.syncPreferencesFromProfile(userId, {
      sustainability_goals: dto.sustainability_goals,
    });

    return saved;
  }
  //badges
  async markOnboarded(userId: string) {
    const profile = await this.findOrFail(userId);
    profile.is_onboarded = true;

    const saved = await this.repo.save(profile);
    // TODO Sprint badges : déclencher le badge onboarding ici quand les noms/seuils seront définis

    return saved;
  }

  /**
  * Appelé après le questionnaire.
  * Stocke le score brut du QCM puis recalcule le score final pondéré.
  *
  * Formule spec AFRATIM :
  *   score_final = (questionnaire * 20%)
  *               + (reservations  * 40%)   ← Sprint 4
  *               + (feedbacks     * 20%)   ← Sprint 8
  *               + (partages      * 20%)   ← Sprint 7
  */
  async updateQuestionnaireScore(userId: string, scoreQuestionnaire: number) {
    const profile = await this.findOrFail(userId);

    // Sauvegarder le composant questionnaire
    profile.score_questionnaire = scoreQuestionnaire;

    // Recalculer le score final avec la pondération
    profile.sustainability_score = this.calculateFinalScore(profile);

    const saved = await this.repo.save(profile);

    // Synchroniser dans MongoDB
    await this.mongoService.updateScore(userId, profile.sustainability_score);

    // TODO Sprint badges : déclencher les badges liés au score ici quand les noms/seuils seront définis

    return saved;
  }

  /**
   * Appelé aux Sprints 4, 7, 8 pour mettre à jour les autres composants.
   */
  async updateScoreComponent(
    userId: string,
    component: 'reservations' | 'feedbacks' | 'partages',
    value: number,
   ) {
    const profile = await this.findOrFail(userId);

    if (component === 'reservations') profile.score_reservations = value;
    if (component === 'feedbacks') profile.score_feedbacks = value;
    if (component === 'partages') profile.score_partages = value;

    profile.sustainability_score = this.calculateFinalScore(profile);

    const saved = await this.repo.save(profile);
    await this.mongoService.updateScore(userId, profile.sustainability_score);

    // TODO Sprint badges : déclencher les badges liés au score ici quand les noms/seuils seront définis

    return saved;
  }

  /**
   * Composant « réservations » du score (40 %).
   *
   * Il mesure la durabilité de ce que le voyageur réserve réellement : la
   * moyenne des scores des offres et circuits qu'il a fait confirmer. Réserver
   * beaucoup ne suffit pas, c'est la qualité de ce qu'on réserve qui compte —
   * le même principe que du côté des professionnels, notés sur leurs
   * publications et non sur leur nombre.
   *
   * Les réservations encore en attente ne comptent pas : rien n'est acquis
   * tant que le prestataire n'a pas confirmé.
   */
  private async calculerScoreReservations(userId: string): Promise<number> {
    const lignes = await this.reservationRepo
      .createQueryBuilder('r')
      .leftJoin('r.offer', 'o')
      .leftJoin('r.circuit', 'c')
      .select('COALESCE(o.sustainability_score, c.sustainability_score)', 'score')
      .where('r.organizer_id = :userId', { userId })
      .andWhere('r.status IN (:...statuts)', { statuts: ['confirmed', 'completed'] })
      .getRawMany<{ score: string | number | null }>();

    const scores = lignes
      .map((l) => (l.score == null ? null : Number(l.score)))
      .filter((n): n is number => n !== null && Number.isFinite(n));
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((t, n) => t + n, 0) / scores.length);
  }

  private async findOrFail(userId: string) {
    const profile = await this.repo.findOne({ where: { user_id: userId } });
    if (!profile) {
      throw new NotFoundException("Profil introuvable. Complétez d'abord votre profil de base.");
    }
    return profile;
  }

  /**
   * Score final pondéré selon la spec AFRATIM :
   *   Questionnaire  20%
   *   Réservations   40%
   *   Feedbacks      20%
   *   Partages       20%
   */
  private calculateFinalScore(p: Partial<EcoTraveler>): number {
    const q = p.score_questionnaire ?? 0;  // 20%
    const r = p.score_reservations ?? 0;  // 40%
    const f = p.score_feedbacks ?? 0;  // 20%
    const s = p.score_partages ?? 0;  // 20%

    return Math.round(q * 0.20 + r * 0.40 + f * 0.20 + s * 0.20);
  }

  /**
   * Completion % du profil  :
   *   Identité 30% | Profil voyageur 20% | Intérêts 15%
   *   Préférences 15% | Objectifs 10% | Photo 10%
   */
  // ── Search ──────────────────────────────────────────────────────────────────

  async searchTravelers(query: string, currentUserId: string) {
    const q = query.trim();
    // Require at least 2 chars — never return a dump of all travelers
    if (q.length < 2) return [];
    const like = `%${q.toLowerCase()}%`;
    const results = await this.repo
      .createQueryBuilder('t')
      .innerJoin('t.user', 'u')
      .where('t.user_id != :me', { me: currentUserId })
      .andWhere('u.role = :role', { role: 'eco_traveler' })
      .andWhere('(LOWER(t.full_name) LIKE :like OR LOWER(u.email) LIKE :like)', { like })
      .select(['t.user_id', 't.full_name', 't.photo', 't.country', 't.sustainability_score'])
      .limit(10)
      .getMany();
    return results;
  }

  // ── Public profile ───────────────────────────────────────────────────────────

  async getPublicProfile(targetId: string, viewerId: string) {
    const profile = await this.repo.findOne({ where: { user_id: targetId } });
    if (!profile) throw new NotFoundException('Profil introuvable.');

    const publications = await this.pubRepo.find({
      where: { author_id: targetId, status: 'approved' },
      order: { created_at: 'DESC' },
    });

    const friendship = await this.friendRepo.findOne({
      where: [
        { requester_id: viewerId, receiver_id: targetId },
        { requester_id: targetId, receiver_id: viewerId },
      ],
    });

    let friendStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
    let friendshipId: string | null = null;
    if (friendship) {
      friendshipId = friendship.id;
      if (friendship.status === 'accepted') {
        friendStatus = 'accepted';
      } else if (friendship.requester_id === viewerId) {
        friendStatus = 'pending_sent';
      } else {
        friendStatus = 'pending_received';
      }
    }

    return {
      user_id: profile.user_id,
      full_name: profile.full_name,
      bio: profile.bio,
      photo: profile.photo,
      cover_photo: profile.cover_photo,
      country: profile.country,
      sustainability_score: profile.sustainability_score,
      traveler_types: profile.traveler_types,
      motivations: profile.motivations,
      interests: profile.interests,
      landscapes: profile.landscapes,
      sustainability_values: profile.sustainability_values,
      sustainability_goals: profile.sustainability_goals,
      publications,
      friend_status: friendStatus,
      friendship_id: friendshipId,
    };
  }

  // ── Friendships ──────────────────────────────────────────────────────────────

  async sendFriendRequest(requesterId: string, receiverId: string) {
    if (requesterId === receiverId) throw new BadRequestException('Action invalide.');
    const existing = await this.friendRepo.findOne({
      where: [
        { requester_id: requesterId, receiver_id: receiverId },
        { requester_id: receiverId, receiver_id: requesterId },
      ],
    });
    if (existing) throw new BadRequestException('Une relation existe déjà.');
    const req = this.friendRepo.create({ requester_id: requesterId, receiver_id: receiverId, status: 'pending' });
    return this.friendRepo.save(req);
  }

  async acceptFriendRequest(userId: string, friendshipId: string) {
    const f = await this.friendRepo.findOne({ where: { id: friendshipId } });
    if (!f) throw new NotFoundException('Demande introuvable.');
    if (f.receiver_id !== userId) throw new ForbiddenException('Accès refusé.');
    f.status = 'accepted';
    return this.friendRepo.save(f);
  }

  async removeFriendship(userId: string, friendshipId: string) {
    const f = await this.friendRepo.findOne({ where: { id: friendshipId } });
    if (!f) throw new NotFoundException('Relation introuvable.');
    if (f.requester_id !== userId && f.receiver_id !== userId) throw new ForbiddenException('Accès refusé.');
    await this.friendRepo.remove(f);
    return { message: 'Supprimé.' };
  }

  async getFriends(userId: string) {
    const rows = await this.friendRepo.find({
      where: [
        { requester_id: userId, status: 'accepted' },
        { receiver_id: userId, status: 'accepted' },
      ],
    });
    if (!rows.length) return [];
    const friendIds = rows.map((r) => (r.requester_id === userId ? r.receiver_id : r.requester_id));
    const profiles = await this.repo
      .createQueryBuilder('t')
      .where('t.user_id IN (:...ids)', { ids: friendIds })
      .select(['t.user_id', 't.full_name', 't.photo', 't.country', 't.sustainability_score'])
      .getMany();
    return profiles.map((p) => ({
      ...p,
      friendship_id: rows.find((r) => r.requester_id === p.user_id || r.receiver_id === p.user_id)?.id ?? null,
    }));
  }

  async getPublicFriends(targetId: string) {
    const rows = await this.friendRepo.find({
      where: [
        { requester_id: targetId, status: 'accepted' },
        { receiver_id: targetId, status: 'accepted' },
      ],
    });
    if (!rows.length) return [];
    const friendIds = rows.map((r) => (r.requester_id === targetId ? r.receiver_id : r.requester_id));
    return this.repo
      .createQueryBuilder('t')
      .where('t.user_id IN (:...ids)', { ids: friendIds })
      .select(['t.user_id', 't.full_name', 't.photo', 't.country'])
      .getMany();
  }

  async getPendingRequests(userId: string) {
    const rows = await this.friendRepo.find({
      where: { receiver_id: userId, status: 'pending' },
      order: { created_at: 'DESC' },
    });
    if (!rows.length) return [];
    const senderIds = rows.map((r) => r.requester_id);
    const profiles = await this.repo
      .createQueryBuilder('t')
      .where('t.user_id IN (:...ids)', { ids: senderIds })
      .select(['t.user_id', 't.full_name', 't.photo'])
      .getMany();
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      sender: profiles.find((p) => p.user_id === r.requester_id) ?? { user_id: r.requester_id, full_name: 'Utilisateur', photo: null },
    }));
  }

  async blockUser(blockerId: string, targetId: string) {
    if (blockerId === targetId) throw new BadRequestException('Action invalide.');
    // Remove any existing friendship first
    const existing = await this.friendRepo.findOne({
      where: [
        { requester_id: blockerId, receiver_id: targetId },
        { requester_id: targetId, receiver_id: blockerId },
      ],
    });
    if (existing) await this.friendRepo.remove(existing);
    // Save block as a special friendship record
    const block = this.friendRepo.create({ requester_id: blockerId, receiver_id: targetId, status: 'blocked' });
    return this.friendRepo.save(block);
  }

  /**
   * Signalement d'un autre membre depuis son réseau.
   *
   * Il créait une ligne dans `friendships`, avec le motif encodé dans la
   * colonne `status` — une amitié au statut `report:…`. L'administrateur, qui
   * ne lit que la table `reports`, n'en voyait jamais rien, et le signalement
   * atterrissait parmi les demandes d'amitié.
   */
  async reportUser(reporterId: string, targetId: string, reason: string) {
    if (reporterId === targetId) throw new BadRequestException('Action invalide.');
    return this.reportsService.createReport(reporterId, 'eco_traveler', targetId, reason);
  }

  /**
   * Complétion du profil éco-voyageur, calée sur les 5 étapes de son onboarding.
   *
   * `travel_styles` valait 7 points alors qu'il n'est jamais collecté — le
   * champ est déclaré « conservé en state, non affiché ni envoyé ». Tous les
   * voyageurs plafonnaient donc à 93 %. Ces 7 points sont redistribués sur les
   * motivations et les valeurs, que l'étape 4 collecte séparément.
   */
  /** Le barème, ligne à ligne — c'est lui qui produit le pourcentage. */
  private lignesCompletion(p: Partial<EcoTraveler>): LigneCompletion[] {
    return [
      lignePartielle('Identité', 'Nom, pays et langue', 20, [p.full_name, p.country, p.language]),
      ligne('Identité', 'Photo de profil', 5, p.photo),
      ligne('Identité', 'Biographie', 5, p.bio),
      ligne('Profil voyageur', 'Type de voyageur', 15, p.traveler_types),
      ligne('Intérêts', "Centres d'intérêt", 15, p.interests),
      ligne('Intérêts', 'Paysages préférés', 10, p.landscapes),
      ligne('Motivations', 'Motivations de voyage', 10, p.motivations),
      ligne('Motivations', 'Valeurs de durabilité', 10, p.sustainability_values),
      ligne('Objectifs', 'Objectifs durables', 10, p.sustainability_goals),
    ];
  }

  private calculateCompletion(p: Partial<EcoTraveler>): number {
    return totalCompletion(this.lignesCompletion(p));
  }
}