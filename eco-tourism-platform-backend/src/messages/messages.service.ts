import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { EcoTraveler } from '../eco-traveler/entities/eco-traveler.entity';
import { Provider } from '../provider/entities/provider.entity';
import { Guide } from '../guide/entities/guide.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(EcoTraveler)
    private readonly ecoRepo: Repository<EcoTraveler>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Guide)
    private readonly guideRepo: Repository<Guide>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async getUserInfo(userId: string, role: string) {
    let entity: any = null;
    if (role === 'eco_traveler') {
      entity = await this.ecoRepo.findOne({ where: { user_id: userId } });
    } else if (role === 'guide') {
      entity = await this.guideRepo.findOne({ where: { user_id: userId } });
    } else {
      entity = await this.providerRepo.findOne({ where: { user_id: userId } });
    }
    return {
      user_id: userId,
      full_name: entity?.full_name ?? null,
      photo: entity?.photo ?? null,
      role,
    };
  }

  async createOrGet(callerId: string, callerRole: string, recipientId: string) {
    const recipientUser = await this.userRepo.findOne({ where: { id: recipientId } });
    if (!recipientUser) throw new NotFoundException('Destinataire introuvable.');
    const recipientRole = recipientUser.role;

    const allowed = callerId !== recipientId;
    if (!allowed) throw new ForbiddenException('Action invalide.');

    const existing = await this.convRepo
      .createQueryBuilder('c')
      .where(
        '(c.participant_a_id = :a AND c.participant_b_id = :b) OR (c.participant_a_id = :b AND c.participant_b_id = :a)',
        { a: callerId, b: recipientId },
      )
      .getOne();

    if (existing) {
      let changed = false;
      if (existing.participant_a_role === 'unknown') { existing.participant_a_role = callerRole; changed = true; }
      if (existing.participant_b_role === 'unknown') { existing.participant_b_role = recipientRole; changed = true; }
      if (changed) await this.convRepo.save(existing);
      return { id: existing.id };
    }

    const conv = this.convRepo.create({
      participant_a_id: callerId,
      participant_a_role: callerRole,
      participant_b_id: recipientId,
      participant_b_role: recipientRole,
    });
    const saved = await this.convRepo.save(conv);
    return { id: saved.id };
  }

  async getMyConversations(userId: string) {
    const convs = await this.convRepo
      .createQueryBuilder('c')
      .where('c.participant_a_id = :uid OR c.participant_b_id = :uid', { uid: userId })
      .orderBy('c.created_at', 'DESC')
      .getMany();

    return Promise.all(
      convs.map(async (c) => {
        const otherId = c.participant_a_id === userId ? c.participant_b_id : c.participant_a_id;
        const otherRole = c.participant_a_id === userId ? c.participant_b_role : c.participant_a_role;
        const otherUser = await this.getUserInfo(otherId, otherRole);
        const lastMsg = await this.msgRepo.findOne({ where: { conversation_id: c.id }, order: { created_at: 'DESC' } });
        const unread = await this.msgRepo.count({ where: { conversation_id: c.id, is_read: false, sender_id: otherId } });
        return {
          id: c.id,
          other_user: otherUser,
          last_message: lastMsg ? { content: lastMsg.content, created_at: lastMsg.created_at, is_mine: lastMsg.sender_id === userId } : null,
          unread_count: unread,
        };
      }),
    );
  }

  async getConversation(convId: string, userId: string) {
    const c = await this.convRepo.findOne({ where: { id: convId } });
    if (!c) throw new NotFoundException('Conversation introuvable.');
    if (c.participant_a_id !== userId && c.participant_b_id !== userId) throw new ForbiddenException('Accès refusé.');

    const otherId = c.participant_a_id === userId ? c.participant_b_id : c.participant_a_id;
    const otherRole = c.participant_a_id === userId ? c.participant_b_role : c.participant_a_role;
    const otherUser = await this.getUserInfo(otherId, otherRole);
    const lastMsg = await this.msgRepo.findOne({ where: { conversation_id: c.id }, order: { created_at: 'DESC' } });
    const unread = await this.msgRepo.count({ where: { conversation_id: c.id, is_read: false, sender_id: otherId } });

    return {
      id: c.id,
      other_user: otherUser,
      last_message: lastMsg ? { content: lastMsg.content, created_at: lastMsg.created_at, is_mine: lastMsg.sender_id === userId } : null,
      unread_count: unread,
    };
  }

  async getMessages(convId: string, userId: string) {
    const c = await this.convRepo.findOne({ where: { id: convId } });
    if (!c) throw new NotFoundException('Conversation introuvable.');
    if (c.participant_a_id !== userId && c.participant_b_id !== userId) throw new ForbiddenException('Accès refusé.');

    await this.msgRepo
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .where('conversation_id = :convId AND sender_id != :uid AND is_read = false', { convId, uid: userId })
      .execute();

    const msgs = await this.msgRepo.find({ where: { conversation_id: convId }, order: { created_at: 'ASC' } });
    return msgs.map((m) => ({ id: m.id, content: m.content, sender_id: m.sender_id, created_at: m.created_at, is_mine: m.sender_id === userId }));
  }

  async deleteConversation(convId: string, userId: string) {
    const c = await this.convRepo.findOne({ where: { id: convId } });
    if (!c) throw new NotFoundException('Conversation introuvable.');
    if (c.participant_a_id !== userId && c.participant_b_id !== userId) throw new ForbiddenException('Accès refusé.');
    await this.msgRepo.delete({ conversation_id: convId });
    await this.convRepo.remove(c);
    return { message: 'Conversation supprimée.' };
  }

  async sendMessage(convId: string, senderId: string, senderRole: string, content: string) {
    const c = await this.convRepo.findOne({ where: { id: convId } });
    if (!c) throw new NotFoundException('Conversation introuvable.');
    if (c.participant_a_id !== senderId && c.participant_b_id !== senderId) throw new ForbiddenException('Accès refusé.');

    const msg = this.msgRepo.create({ conversation_id: convId, sender_id: senderId, sender_role: senderRole, content });
    const saved = await this.msgRepo.save(msg);
    return { id: saved.id, content: saved.content, sender_id: saved.sender_id, created_at: saved.created_at, is_mine: true };
  }
}
