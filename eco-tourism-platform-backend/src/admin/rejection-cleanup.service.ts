import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Not, Repository } from 'typeorm';

import { Guide } from '../guide/entities/guide.entity';
import { Provider } from '../provider/entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { REJECTION_GRACE_HOURS } from './admin.service';

/**
 * Un profil professionnel refusé laisse 24h à son titulaire pour réagir, puis
 * son compte est désactivé. La désactivation passe par `users.status` :
 * l'authentification refuse déjà tout statut différent de ACTIVE.
 */
@Injectable()
export class RejectionCleanupService {
  private readonly logger = new Logger(RejectionCleanupService.name);

  constructor(
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,

    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async disableExpiredRejections(): Promise<number> {
    const deadline = new Date(Date.now() - REJECTION_GRACE_HOURS * 3600 * 1000);

    const [guides, providers] = await Promise.all([
      this.guideRepo.find({ where: { status: 'rejected', rejected_at: LessThanOrEqual(deadline) } }),
      this.providerRepo.find({ where: { status: 'rejected', rejected_at: LessThanOrEqual(deadline) } }),
    ]);

    const userIds = [...new Set([...guides, ...providers].map((p) => p.user_id))];
    if (!userIds.length) return 0;

    // Ne pas toucher aux comptes déjà désactivés : le compteur doit refléter
    // les désactivations réellement effectuées.
    const toDisable = await this.userRepo.find({
      where: { id: In(userIds), status: Not(In([UserStatus.ARCHIVED, UserStatus.BANNED])) },
    });
    if (!toDisable.length) return 0;

    await this.userRepo.update(
      { id: In(toDisable.map((u) => u.id)) },
      { status: UserStatus.ARCHIVED },
    );

    this.logger.log(`${toDisable.length} compte(s) désactivé(s) après refus de profil.`);
    return toDisable.length;
  }
}
