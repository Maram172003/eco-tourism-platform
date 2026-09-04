import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { User } from '../users/entities/user.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Guide } from '../guide/entities/guide.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EcoTraveler)
    private readonly ecoRepo: Repository<EcoTraveler>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Nom et photo de la personne, cherchés dans la table de son rôle.
   *
   * Tout ce qui n'était pas éco-voyageur était cherché chez les prestataires :
   * le profil d'un guide vit dans `guides`, son nom revenait donc vide et
   * l'administrateur voyait « — » à la place de la personne à sanctionner.
   */
  private async getUserInfo(userId: string, role: string) {
    let entity: any = null;
    if (role === 'eco_traveler') {
      entity = await this.ecoRepo.findOne({ where: { user_id: userId } });
    } else if (role === 'guide') {
      entity = await this.guideRepo.findOne({ where: { user_id: userId } });
    } else {
      entity = await this.providerRepo.findOne({ where: { user_id: userId } as any });
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return {
      user_id: userId,
      full_name: entity?.full_name ?? null,
      photo: entity?.photo ?? null,
      role,
      email: user?.email ?? null,
      status: user?.status ?? null,
    };
  }

  async createReport(reporterId: string, reporterRole: string, reportedId: string, reason: string) {
    if (reporterId === reportedId) throw new BadRequestException('Vous ne pouvez pas vous signaler vous-même.');

    const reportedUser = await this.userRepo.findOne({ where: { id: reportedId } });
    if (!reportedUser) throw new NotFoundException('Utilisateur introuvable.');

    const report = this.reportRepo.create({
      reporter_id: reporterId,
      reporter_role: reporterRole,
      reported_id: reportedId,
      reported_role: reportedUser.role,
      reason,
      status: 'pending',
    });
    return this.reportRepo.save(report);
  }

  async getAllReports() {
    const reports = await this.reportRepo.find({ order: { created_at: 'DESC' } });
    return Promise.all(
      reports.map(async (r) => {
        const reporter = await this.getUserInfo(r.reporter_id, r.reporter_role);
        const reported = await this.getUserInfo(r.reported_id, r.reported_role);
        return { ...r, reporter, reported };
      }),
    );
  }

  async resolveReport(reportId: string, action: string, adminNote: string, banDays?: number) {
    // Atomic update: only transitions from 'pending' → 'processing' once
    const lockResult = await this.reportRepo
      .createQueryBuilder()
      .update(Report)
      .set({ status: 'processing' })
      .where('id = :id AND status = :status', { id: reportId, status: 'pending' })
      .execute();

    if (lockResult.affected === 0) {
      const existing = await this.reportRepo.findOne({ where: { id: reportId } });
      if (!existing) throw new NotFoundException('Signalement introuvable.');
      throw new BadRequestException('Ce signalement est déjà traité.');
    }

    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    const reportedUser = await this.userRepo.findOne({ where: { id: report.reported_id } });
    const reporterUser = await this.userRepo.findOne({ where: { id: report.reporter_id } });
    const reportedInfo = await this.getUserInfo(report.reported_id, report.reported_role);

    if (action === 'warn') {
      if (reportedUser) {
        await this.mailService.sendReportWarning(reportedUser.email, reportedInfo.full_name ?? 'Utilisateur', report.reason, adminNote);
      }
    } else if (action === 'ban') {
      if (reportedUser) {
        reportedUser.status = 'banned' as any;
        // null = permanent, date = temporary
        if (banDays && banDays > 0) {
          const d = new Date();
          d.setDate(d.getDate() + banDays);
          d.setHours(23, 59, 59, 999);
          reportedUser.ban_until = d;
        } else {
          reportedUser.ban_until = null;
        }
        // Revoke tokens so existing sessions stop working immediately
        reportedUser.refresh_token = null;
        reportedUser.refresh_token_expires_at = null;
        await this.userRepo.save(reportedUser);
        await this.mailService.sendAccountBanned(reportedUser.email, reportedInfo.full_name ?? 'Utilisateur', adminNote, banDays ?? 0);
      }
    } else if (action === 'delete') {
      if (reportedUser) {
        await this.userRepo.remove(reportedUser);
      }
    }

    // Notify reporter of the decision
    if (reporterUser) {
      const reporterInfo = await this.getUserInfo(report.reporter_id, report.reporter_role ?? 'provider');
      await this.mailService.sendReportResult(reporterUser.email, reporterInfo.full_name ?? 'Utilisateur', action, reportedInfo.full_name ?? 'l\'utilisateur signalé', adminNote);
    }

    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.action_taken = action;
    report.admin_note = adminNote || null;
    report.resolved_at = new Date();
    return this.reportRepo.save(report);
  }
}
