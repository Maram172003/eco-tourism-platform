import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(userId: string, type: string, data: Record<string, any>): Promise<Notification> {
    return this.repo.save(this.repo.create({ user_id: userId, type, data }));
  }

  // Supprime les notifications du même type/offre pour un utilisateur
  async deleteForOffer(userId: string, type: string, offerId: string): Promise<void> {
    const existing = await this.repo.find({ where: { user_id: userId, type } });
    const toDelete = existing.filter((n) => n.data?.offer_id === offerId);
    if (toDelete.length) await this.repo.remove(toDelete);
  }

  // Supprime les anciennes notifications du même type/offre pour un utilisateur, puis crée la nouvelle
  async replaceForOffer(userId: string, type: string, offerId: string, data: Record<string, any>): Promise<Notification> {
    await this.deleteForOffer(userId, type, offerId);
    return this.repo.save(this.repo.create({ user_id: userId, type, data }));
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.repo.update({ id, user_id: userId }, { is_read: true });
  }

  async markUnread(userId: string, id: string): Promise<void> {
    await this.repo.update({ id, user_id: userId }, { is_read: false });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ user_id: userId, is_read: false }, { is_read: true });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { user_id: userId, is_read: false } });
  }

  async deleteNotification(userId: string, id: string): Promise<void> {
    await this.repo.delete({ id, user_id: userId });
  }

  async reportNotification(userId: string, id: string): Promise<void> {
    const notif = await this.repo.findOne({ where: { id, user_id: userId } });
    if (notif) {
      notif.data = { ...notif.data, is_reported: true };
      notif.is_read = true;
      await this.repo.save(notif);
    }
  }
}
