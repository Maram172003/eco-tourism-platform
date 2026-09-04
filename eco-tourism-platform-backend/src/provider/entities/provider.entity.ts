import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

// Types de prestataires (remplace guide_type + project_type)
// guide | agence | ecolodge | camping | restaurant | artisan | association | bien_etre | transport

@Entity('providers')
export class Provider {
  // Même ID que le user (relation 1-1)
  @PrimaryColumn('uuid')
  user_id!: string;

  // ── Identité personnelle du prestataire ──────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  full_name!: string | null;

  @Column({ type: 'text', nullable: true })
  photo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  position!: string | null;

  @Column({ type: 'text', nullable: true })
  personal_bio!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  languages_spoken!: string[] | null;

  @Column({ type: 'int', nullable: true })
  years_experience!: number | null;

  // Certifications personnelles : [{name, document_url}]
  @Column({ type: 'jsonb', nullable: true })
  personal_certifications!: Array<{ name: string; document_url?: string }> | null;

  // ── Lien organisation ─────────────────────────────────────────────────────
  // Type principal : guide | agence | ecolodge | camping | restaurant | artisan | association | bien_etre | transport
  @Column({ type: 'varchar', nullable: true })
  provider_type!: string | null;

  @Column({ type: 'varchar', nullable: true })
  organization!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', nullable: true })
  language!: string | null;

  @Column({ type: 'text', nullable: true })
  cover_photo!: string | null;

  // ── Contact ───────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  whatsapp!: string | null;

  @Column({ type: 'varchar', nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebook!: string | null;

  @Column({ type: 'varchar', nullable: true })
  instagram!: string | null;

  // ── Localisation ──────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  region!: string | null;

  @Column({ type: 'varchar', nullable: true })
  address!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng!: number | null;

  // Zone d'intervention (pour les guides itinérants)
  @Column({ type: 'varchar', nullable: true })
  zone!: string | null;

  // ── Activités & Services ──────────────────────────────────────────────────
  @Column({ type: 'simple-array', nullable: true })
  activity_types!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  secondary_activity_types!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  specialties!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  services!: string[] | null;

  // ── Médias ────────────────────────────────────────────────────────────────
  @Column({ type: 'simple-array', nullable: true })
  photos!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  videos!: string[] | null;

  // ── Durabilité (org — à migrer vers organizations plus tard) ─────────────
  @Column({ type: 'simple-array', nullable: true })
  eco_labels!: string[] | null;

  @Column({ type: 'int', nullable: true })
  sustainability_score!: number | null;

  @Column({ type: 'int', nullable: true })
  score_questionnaire!: number | null;

  @Column({ type: 'int', nullable: true })
  score_reservations!: number | null;

  @Column({ type: 'int', nullable: true })
  score_feedbacks!: number | null;

  /** Complétion du profil, en pourcentage — recalculée à chaque enregistrement. */
  @Column({ type: 'int', default: 0 })
  profile_completion!: number;

  // ── Histoire / À propos ───────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  history!: string | null;

  @Column({ type: 'varchar', nullable: true })
  opening_hours!: string | null;

  // ── Statut ────────────────────────────────────────────────────────────────
  // pending | active | rejected
  @Column({ type: 'varchar', default: 'active' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string | null;

  // Horodatage du refus : le compte est désactivé 24h après cette date.
  @Column({ type: 'timestamp', nullable: true })
  rejected_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
