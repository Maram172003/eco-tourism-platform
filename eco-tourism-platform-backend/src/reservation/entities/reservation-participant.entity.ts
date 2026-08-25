import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';

@Entity('reservation_participants')
export class ReservationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  reservation_id!: string;

  @ManyToOne(() => Reservation, (r) => r.participants, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  // user_id de l'ami invité (null si invitation email seule)
  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  // pending | accepted | declined
  @Column({ type: 'varchar', default: 'pending' })
  status!: string;

  @CreateDateColumn()
  invited_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  responded_at!: Date | null;
}
