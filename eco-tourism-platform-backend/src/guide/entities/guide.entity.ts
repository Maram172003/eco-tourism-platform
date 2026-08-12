import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('guides')
export class Guide {
  @PrimaryColumn('uuid')
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar' })
  full_name!: string;

  @Column({ type: 'varchar', nullable: true })
  guide_type!: string | null; // local | professionnel

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', nullable: true })
  language!: string | null;

  @Column({ type: 'text', nullable: true })
  photo!: string | null;

  @Column({ type: 'text', nullable: true })
  cover_photo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  zone!: string | null; // geographic zone of activity

  @Column({ type: 'simple-array', nullable: true })
  specialties!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  domaines!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  expertises!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  languages_spoken!: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  telephone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ville_residence!: string | null;

  @Column({ type: 'int', nullable: true })
  years_experience!: number | null;

  @Column({ type: 'text', nullable: true })
  experience_pro!: string | null;

  @Column({ type: 'text', nullable: true })
  centres_interet!: string | null;

  @Column({ type: 'text', nullable: true })
  pourquoi_moi!: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status!: string; // pending | active | rejected | suspended

  // Motif renseigné par l'administrateur lorsqu'il refuse le profil.
  @Column({ type: 'text', nullable: true })
  rejection_reason!: string | null;

  // Horodatage du refus : le compte est désactivé 24h après cette date.
  @Column({ type: 'timestamp', nullable: true })
  rejected_at!: Date | null;

  @Column({ type: 'int', default: 0 })
  profile_completion!: number;

  @Column({ type: 'boolean', default: false })
  is_onboarded!: boolean;

  @Column({ type: 'int', nullable: true })
  sustainability_score!: number | null;

  @Column({ type: 'int', nullable: true })
  score_questionnaire!: number | null;

  @Column({ type: 'int', default: 0 })
  score_reservations!: number;

  @Column({ type: 'int', default: 0 })
  score_feedbacks!: number;

  // ── Section 3: Ce que je propose ─────────────────────────────────────────
  @Column({ type: 'simple-array', nullable: true })
  zones_couvertes!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  villes_couvertes!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  sites_maitrises!: string[] | null;

  @Column({ type: 'boolean', nullable: true })
  deplacement_possible!: boolean | null;

  @Column({ type: 'simple-array', nullable: true })
  publics_accueillis!: string[] | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
