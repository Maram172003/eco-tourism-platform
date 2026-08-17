import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Offer } from '../../offer/entities/offer.entity';
import { OfferSession } from '../../offer/entities/offer-session.entity';
import { ReservationParticipant } from './reservation-participant.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  offer_id!: string;

  @ManyToOne(() => Offer, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer;

  // Séance spécifique (scheduled / recurring — null pour instant_stock / on_request)
  @Column({ type: 'uuid', nullable: true })
  session_id!: string | null;

  @ManyToOne(() => OfferSession, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'session_id' })
  session!: OfferSession | null;

  // user_id de l'éco-voyageur organisateur
  @Column('uuid')
  organizer_id!: string;

  // solo | group
  @Column({ type: 'varchar', default: 'solo' })
  reservation_type!: string;

  // pending | confirmed | cancelled | completed | rejected
  @Column({ type: 'varchar', default: 'pending' })
  status!: string;

  // Date souhaitée (obligatoire ; pour une séance = date de la séance)
  @Column({ type: 'date' })
  reservation_date!: Date;

  // Pour hébergement : check-in / check-out
  @Column({ type: 'date', nullable: true })
  arrival_date!: Date | null;

  @Column({ type: 'date', nullable: true })
  departure_date!: Date | null;

  // Créneau horaire pour activités / restaurants
  @Column({ type: 'varchar', nullable: true })
  experience_time!: string | null;

  // Sous-type(s) choisi(s) par le voyageur (offres multi-subtypes)
  @Column({ type: 'jsonb', nullable: true })
  chosen_subtypes!: string[] | null;

  // Champs spécifiques à la réservation (allergies, urgence, notes, motivation...)
  @Column({ type: 'jsonb', nullable: true })
  reservation_details!: Record<string, unknown> | null;

  @Column({ type: 'int', default: 1 })
  participant_count!: number;

  // Prix par personne au moment de la réservation
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_per_person!: number | null;

  // total = price_per_person * participant_count
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_price!: number | null;

  // Montant de l'acompte (deposit_percentage de l'offre * total_price / 100)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  deposit_amount!: number | null;

  @Column({ type: 'boolean', default: false })
  deposit_paid!: boolean;

  // unpaid | deposit_paid | fully_paid
  @Column({ type: 'varchar', default: 'unpaid' })
  payment_status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'text', nullable: true })
  cancellation_reason!: string | null;

  @OneToMany(() => ReservationParticipant, (p) => p.reservation, { cascade: true })
  participants!: ReservationParticipant[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
