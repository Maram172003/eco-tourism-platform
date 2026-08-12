import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Guide } from '../../guide/entities/guide.entity';
import { Provider } from '../../provider/entities/provider.entity';

export type ProfileApproval = {
  role: 'guide' | 'provider' | null;
  status: string | null;
  approved: boolean;
  rejection_reason: string | null;
};

/**
 * Règle commune : un guide ou un prestataire doit voir son profil approuvé par
 * un administrateur avant de pouvoir diffuser une offre ou un circuit.
 * Tant que le profil est « pending », la préparation en brouillon reste possible.
 */
@Injectable()
export class ProfileApprovalService {
  constructor(
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,

    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  async getApproval(userId: string): Promise<ProfileApproval> {
    const guide = await this.guideRepo.findOne({ where: { user_id: userId } as any });
    if (guide) {
      return {
        role: 'guide',
        status: guide.status,
        approved: guide.status === 'active',
        rejection_reason: guide.rejection_reason ?? null,
      };
    }

    const provider = await this.providerRepo.findOne({ where: { user_id: userId } as any });
    if (provider) {
      return {
        role: 'provider',
        status: provider.status,
        approved: provider.status === 'active',
        rejection_reason: provider.rejection_reason ?? null,
      };
    }

    // Aucun profil professionnel : la règle ne s'applique pas.
    return { role: null, status: null, approved: true, rejection_reason: null };
  }

  /** Lève une 403 explicite si le profil n'est pas encore approuvé. */
  async assertApproved(userId: string, action = 'publier'): Promise<void> {
    const approval = await this.getApproval(userId);
    if (approval.approved) return;

    if (approval.status === 'rejected') {
      throw new ForbiddenException(
        approval.rejection_reason
          ? `Votre profil a été refusé : ${approval.rejection_reason}`
          : "Votre profil a été refusé par l'administration.",
      );
    }
    if (approval.status === 'suspended') {
      throw new ForbiddenException(`Votre profil est suspendu : vous ne pouvez pas ${action}.`);
    }
    throw new ForbiddenException(
      `Votre profil doit être validé par un administrateur avant de ${action}. La validation intervient sous 48h.`,
    );
  }
}
