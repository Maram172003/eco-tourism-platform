import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string; // destinataire

  @Column({ type: 'varchar' })
  type: string; // 'collaboration_invite' | ...

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
