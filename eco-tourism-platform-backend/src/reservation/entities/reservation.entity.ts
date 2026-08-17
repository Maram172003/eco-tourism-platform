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
import { Circuit } from '../../circuit/entities/circuit.entity';
import { ReservationParticipant } from './reservation-participant.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  offer_id!: string | null;

  @ManyToOne(() => Offer, { onDelete: 'CASCADE', eager: false, nullable: true })
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer | null;

  @Column({ type: 'uuid', nullable: true })
  circuit_id!: string | null;

  @ManyToOne(() => Circuit, { onDelete: 'CASCADE', eager: false, nullable: true })
  @JoinColumn({ name: 'circuit_id' })
  circuit!: Circuit | null;

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

  // Pour hébergement / circuit multi-jours : check-in / check-out
  @Column({ type: 'date', nullable: true })
  arrival_date!: Date | null;

  @Column({ type: 'date', nullable: true })
  departure_date!: Date | null;

  // Créneau horaire pour activités / restaurants
  @Column({ type: 'varchar', nullable: true })
  experience_time!: string | null;

  // Sous-type(s) ou option(s) choisie(s) (offres / circuits)
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

  // Montant de l'acompte (deposit_percentage * total_price / 100)
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
