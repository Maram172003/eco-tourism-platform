import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { Organization } from '../organization/entities/organization.entity';
import { OnboardingProviderDto, UpdateProviderDto } from './dto/provider.dto';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private readonly repo: Repository<Provider>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
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
    return this.findOrCreate(userId);
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
    return this.repo.save(provider);
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
