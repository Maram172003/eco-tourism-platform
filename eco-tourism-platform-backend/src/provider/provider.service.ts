import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { OnboardingProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { BadgeService } from '../badge/badge.service';
import { ligne, lignePartielle, totalCompletion, type LigneCompletion } from '../common/completion.util';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private readonly repo: Repository<Provider>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly badgeService: BadgeService,
  ) {}

  async findOrCreate(userId: string): Promise<Provider> {
    let provider = await this.repo.findOne({ where: { user_id: userId } });
    if (!provider) {
      provider = this.repo.create({ user_id: userId });
      await this.repo.save(provider);
    }
    return provider;
  }

  async getMyProfile(userId: string): Promise<Provider> {
    const provider = await this.findOrCreate(userId);

    // La complétion n'était calculée que dans `update()` : un prestataire qui
    // terminait son inscription sans jamais rééditer son profil restait à 0 %
    // pour toujours. On la recalcule à la lecture, comme le fait le guide.
    const completion = this.calculateCompletion(provider);
    if (completion !== provider.profile_completion) {
      provider.profile_completion = completion;
      await this.repo.save(provider);
    }

    // Le score de durabilité se déduit désormais de la progression dans
    // l'échelle de badges : le questionnaire donne le départ, les paliers
    // prennent le relais. Il n'était jusqu'ici écrit qu'à la soumission du
    // questionnaire et ne bougeait plus jamais ensuite.
    try {
      const stats = await this.badgeService.getStats(userId, 'provider');
      if (stats.sustainability_score !== provider.sustainability_score) {
        provider.sustainability_score = stats.sustainability_score;
        await this.repo.save(provider);
      }
    } catch { /* le score reste celui déjà enregistré */ }

    // Le détail accompagne le pourcentage : sans lui, un profil à 45 % laisse
    // son propriétaire deviner ce qui manque.
    (provider as any).completion_details = this.lignesCompletion(provider);
    return provider;
  }

  async getPublicProfile(userId: string): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { user_id: userId } });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    return provider;
  }

  async onboard(userId: string, dto: OnboardingProviderDto): Promise<Provider> {
    const provider = await this.findOrCreate(userId);
    Object.assign(provider, dto);
    provider.status = 'pending';
    return this.repo.save(provider);
  }

  async update(userId: string, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.findOrCreate(userId);
    Object.assign(provider, dto);
    provider.profile_completion = this.calculateCompletion(provider);
    return this.repo.save(provider);
  }

  /**
   * Complétion du profil prestataire, calée sur les 4 étapes de son onboarding.
   *
   * Ce rôle n'avait aucun calcul — ni méthode, ni colonne — contrairement aux
   * trois autres. Le barème suit l'ordre du parcours : identité et médias,
   * localisation et contact, activité principale, activités secondaires.
   */
  /** Le barème, ligne à ligne — c'est lui qui produit le pourcentage. */
  lignesCompletion(p: Provider): LigneCompletion[] {
    return [
      lignePartielle('Identité & médias', 'Nom, organisation, type, présentation', 20,
        [p.full_name, p.organization, p.provider_type, p.bio]),
      ligne('Identité & médias', 'Photo de profil', 5, p.photo),
      ligne('Identité & médias', 'Photos de la prestation', 5, p.photos),
      lignePartielle('Localisation & contact', 'Téléphone, région, adresse', 20,
        [p.phone, p.region, p.address]),
      ligne('Localisation & contact', 'Position sur la carte', 5, p.lat),
      ligne('Localisation & contact', 'Site web ou réseau social', 5,
        p.website || p.facebook || p.instagram || p.whatsapp),
      ligne('Activité principale', "Types d'activité", 15, p.activity_types),
      ligne('Activité principale', 'Spécialités', 10, p.specialties),
      ligne('Activité principale', "Années d'expérience", 5, p.years_experience),
      ligne('Activités secondaires', 'Activités secondaires', 10, p.secondary_activity_types),
    ];
  }

  private calculateCompletion(p: Provider): number {
    return totalCompletion(this.lignesCompletion(p));
  }

  async search(q: string): Promise<(Provider & { org_logo: string | null })[]> {
    const providers = await this.repo.find({
      where: [
        { full_name: ILike(`%${q}%`), status: 'active' },
        { organization: ILike(`%${q}%`), status: 'active' },
        { region: ILike(`%${q}%`), status: 'active' },
      ],
      take: 20,
    });
    if (providers.length === 0) return [];
    const orgs = await this.orgRepo.find({ where: { provider_id: In(providers.map(p => p.user_id)) } });
    const orgMap = new Map(orgs.map(o => [o.provider_id, o.logo]));
    return providers.map(p => ({ ...p, org_logo: orgMap.get(p.user_id) ?? null }));
  }

  async findAll(): Promise<Provider[]> {
    return this.repo.find({ where: { status: 'active' }, order: { sustainability_score: 'DESC' } });
  }

  async findByType(type: string): Promise<Provider[]> {
    return this.repo.find({ where: { provider_type: type, status: 'active' } });
  }

  // Admin
  async findPending(): Promise<Provider[]> {
    return this.repo.find({ where: { status: 'pending' }, order: { created_at: 'DESC' } });
  }

  async approve(userId: string): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { user_id: userId } });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    provider.status = 'active';
    return this.repo.save(provider);
  }

  async reject(userId: string, reason: string): Promise<Provider> {
    const provider = await this.repo.findOne({ where: { user_id: userId } });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    provider.status = 'rejected';
    provider.rejection_reason = reason;
    return this.repo.save(provider);
  }

  async updateQuestionnaireScore(userId: string, score: number): Promise<void> {
    const provider = await this.findOrCreate(userId);
    provider.score_questionnaire = score;
    provider.sustainability_score = this.computeScore(provider);
    await this.repo.save(provider);
  }

  private computeScore(p: Provider): number {
    const q = p.score_questionnaire ?? 0;
    const r = p.score_reservations ?? 0;
    const f = p.score_feedbacks ?? 0;
    return Math.min(Math.round(q * 0.5 + r * 0.3 + f * 0.2), 100);
  }
}
