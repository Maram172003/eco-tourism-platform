import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Publication } from '../publication/entities/publication.entity';
import { Offer } from '../offer/entities/offer.entity';
import { User } from '../users/entities/user.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Guide } from '../guide/entities/guide.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuideSkills, GuideSkillsDocument } from '../guide/schemas/guide-skills.schema';
import { Organization } from '../organization/entities/organization.entity';
import { ProviderActivity } from '../provider-activity/entities/provider-activity.entity';
import { ActivityDetails, ActivityDetailsDocument } from '../provider-activity/schemas/activity-details.schema';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';
import { UserStatus } from '../common/enums/user-status.enum';

/** Délai laissé au professionnel refusé avant désactivation de son compte. */
export const REJECTION_GRACE_HOURS = 24;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Publication)
    private readonly pubRepo: Repository<Publication>,

    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(EcoTraveler)
    private readonly ecoRepo: Repository<EcoTraveler>,

    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,

    @InjectModel(GuideSkills.name)
    private readonly guideSkillsModel: Model<GuideSkillsDocument>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(ProviderActivity)
    private readonly activityRepo: Repository<ProviderActivity>,

    @InjectModel(ActivityDetails.name)
    private readonly activityDetailsModel: Model<ActivityDetailsDocument>,

    private readonly mailService: MailService,
    private readonly notifService: NotificationService,
  ) {}

  getPendingPublications() {
    return this.pubRepo.find({ where: { status: 'pending' }, order: { created_at: 'DESC' } });
  }

  async approvePublication(id: string) {
    const pub = await this.findPubOrFail(id);
    pub.status = 'approved';
    pub.rejection_reason = null;
    return this.pubRepo.save(pub);
  }

  async rejectPublication(id: string, reason: string) {
    const pub = await this.findPubOrFail(id);
    pub.status = 'rejected';
    pub.rejection_reason = reason;
    return this.pubRepo.save(pub);
  }

  getPendingOffers() {
    return this.offerRepo.find({ where: { status: 'pending' }, order: { created_at: 'DESC' } });
  }

  async approveOffer(id: string) {
    const offer = await this.findOfferOrFail(id);
    offer.status = 'approved';
    offer.rejection_reason = null;
    return this.offerRepo.save(offer);
  }

  async rejectOffer(id: string, reason: string) {
    const offer = await this.findOfferOrFail(id);
    offer.status = 'rejected';
    offer.rejection_reason = reason;
    return this.offerRepo.save(offer);
  }

  // Providers en attente de validation
  // Le « À propos » d'un prestataire agrège trois sources : sa fiche personnelle
  // (PostgreSQL), son organisation (PostgreSQL) et ses activités déclarées
  // (PostgreSQL + MongoDB). L'administrateur doit voir l'ensemble avant de
  // statuer, on reconstitue donc le même agrégat ici.
  async getPendingProviders() {
    const providers = await this.providerRepo.find({ where: { status: 'pending' }, order: { created_at: 'DESC' } });
    if (!providers.length) return [];

    const ids = providers.map((p) => p.user_id);
    const [orgs, activities, users] = await Promise.all([
      this.orgRepo.find({ where: { provider_id: In(ids) } }),
      this.activityRepo.find({ where: { provider_id: In(ids) } }),
      this.userRepo.find({ where: { id: In(ids) } }),
    ]);
    const details = activities.length
      ? await this.activityDetailsModel.find({ activity_id: { $in: activities.map((a) => a.id) } })
      : [];

    return providers.map((provider) => {
      const org = orgs.find((o) => o.provider_id === provider.user_id) ?? null;
      const own = activities
        .filter((a) => a.provider_id === provider.user_id)
        .map((a) => {
          const d = details.find((x) => x.activity_id === a.id);
          return {
            ...a,
            fields: d?.fields ?? {},
            photos: d?.photos ?? {},
            certifications: d?.certifications ?? [],
          };
        });
      const account = users.find((u) => u.id === provider.user_id);
      return {
        ...provider,
        org,
        activities: own,
        account_email: account?.email ?? null,
        member_since: account?.created_at ?? provider.created_at ?? null,
      };
    });
  }

  async approveProvider(userId: string) {
    const provider = await this.providerRepo.findOne({ where: { user_id: userId } });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    provider.status = 'active';
    provider.rejection_reason = null;
    return this.providerRepo.save(provider);
  }

  // Guides en attente de validation
  // Les certifications d'un guide vivent dans MongoDB : sans cette jointure,
  // l'administrateur validerait un profil sans pouvoir consulter ses justificatifs.
  async getPendingGuides() {
    const guides = await this.guideRepo.find({ where: { status: 'pending' }, order: { created_at: 'DESC' } });
    if (!guides.length) return [];

    const [skills, users] = await Promise.all([
      this.guideSkillsModel.find({ user_id: { $in: guides.map((g) => g.user_id) } }),
      this.userRepo.find({ where: { id: In(guides.map((g) => g.user_id)) } }),
    ]);

    return guides.map((guide) => {
      const s = skills.find((sk) => sk.user_id === guide.user_id);
      const account = users.find((u) => u.id === guide.user_id);
      return {
        ...guide,
        account_email: account?.email ?? null,
        member_since: account?.created_at ?? guide.created_at ?? null,
        certifications: s?.certifications ?? [],
        assurance: s?.assurance ?? null,
        skills_activities: s?.activities ?? [],
        skills_landscapes: s?.landscapes ?? [],
      };
    });
  }

  async approveGuide(userId: string) {
    const guide = await this.guideRepo.findOne({ where: { user_id: userId } });
    if (!guide) throw new NotFoundException('Guide introuvable.');
    guide.status = 'active';
    guide.rejection_reason = null;
    return this.guideRepo.save(guide);
  }

  async rejectGuide(userId: string, reason: string) {
    const guide = await this.guideRepo.findOne({ where: { user_id: userId } });
    if (!guide) throw new NotFoundException('Guide introuvable.');
    guide.status = 'rejected';
    guide.rejection_reason = reason;
    guide.rejected_at = new Date();
    const saved = await this.guideRepo.save(guide);
    await this.announceRejection(userId, guide.full_name ?? null, reason);
    return saved;
  }

  async rejectProvider(userId: string, reason: string) {
    const provider = await this.providerRepo.findOne({ where: { user_id: userId } });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    provider.status = 'rejected';
    provider.rejection_reason = reason;
    provider.rejected_at = new Date();
    const saved = await this.providerRepo.save(provider);
    await this.announceRejection(userId, provider.full_name ?? null, reason);
    return saved;
  }

  /**
   * Prévient l'intéressé de son refus : notification dans l'application et
   * courriel, tous deux mentionnant le délai avant désactivation du compte.
   * Un envoi qui échoue ne doit pas faire échouer la modération elle-même.
   */
  private async announceRejection(userId: string, name: string | null, reason: string) {
    const deadline = new Date(Date.now() + REJECTION_GRACE_HOURS * 3600 * 1000);

    try {
      await this.notifService.create(userId, 'profile_rejected', {
        reason: reason ?? null,
        disable_at: deadline.toISOString(),
        grace_hours: REJECTION_GRACE_HOURS,
      });
    } catch { /* la notification est un confort, pas une condition */ }

    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user?.email) {
        await this.mailService.sendProfileRejected(user.email, name, reason, REJECTION_GRACE_HOURS);
      }
    } catch { /* idem pour le courriel */ }
  }

  async getBannedUsers() {
    const users = await this.userRepo.find({ where: { status: 'banned' as any } });
    return Promise.all(users.map(async (u) => {
      let profile: any = null;
      if (u.role === 'eco_traveler') profile = await this.ecoRepo.findOne({ where: { user_id: u.id } });
      else if (u.role === 'provider') profile = await this.providerRepo.findOne({ where: { user_id: u.id } });
      return {
        user_id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        ban_until: u.ban_until,
        banned_at: u.updated_at,
        full_name: profile?.full_name ?? null,
        photo: profile?.photo ?? null,
      };
    }));
  }

  async updateBan(userId: string, banDays?: number, note?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    user.status = 'banned' as any;
    if (banDays && banDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + banDays);
      d.setHours(23, 59, 59, 999);
      user.ban_until = d;
    } else {
      user.ban_until = null;
    }
    user.refresh_token = null;
    user.refresh_token_expires_at = null;
    await this.userRepo.save(user);
    await this.mailService.sendAccountBanned(user.email, null, note ?? '', banDays ?? 0);
    return { message: 'Ban mis à jour.', ban_until: user.ban_until };
  }

  async unbanUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    user.status = 'active' as any;
    user.ban_until = null;
    await this.userRepo.save(user);
    await this.mailService.sendUnban(user.email);
    return { message: 'Utilisateur débanni.' };
  }

  private async findPubOrFail(id: string) {
    const pub = await this.pubRepo.findOne({ where: { id } });
    if (!pub) throw new NotFoundException('Publication introuvable.');
    return pub;
  }

  private async findOfferOrFail(id: string) {
    const offer = await this.offerRepo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Offre introuvable.');
    return offer;
  }
}
