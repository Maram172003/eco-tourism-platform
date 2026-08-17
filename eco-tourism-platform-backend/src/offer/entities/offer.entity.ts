import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID du Provider qui a créé cette offre (= providers.user_id)
  @Column('uuid')
  author_id!: string;

  @Column({ type: 'varchar', default: 'provider' })
  author_type!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number | null;

  // Durée en texte libre : "2h", "1 journée", "3 jours"
  @Column({ type: 'varchar', nullable: true })
  duration!: string | null;

  // 9 types : hebergement | activite | circuit | restauration | artisanat | location_materiel | volontariat | bien_etre | transport
  @Column({ type: 'varchar', nullable: true })
  offer_type!: string | null;

  @Column({ type: 'varchar', nullable: true })
  offer_subtype!: string | null;

  // instant_stock | calendar_stock | scheduled | recurring | on_request | mixed
  @Column({ type: 'varchar', nullable: true })
  fulfillment_mode!: string | null;

  // instant | manual | conditional
  @Column({ type: 'varchar', default: 'manual' })
  confirmation_mode!: string;

  // per_person | per_group | per_night | per_unit | on_request
  @Column({ type: 'varchar', default: 'per_person' })
  price_type!: string;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ type: 'int', nullable: true })
  booking_deadline_hours!: number | null;

  @Column({ type: 'int', nullable: true })
  confirmation_deadline_hours!: number | null;

  // Délai fabrication artisanat (jours)
  @Column({ type: 'int', nullable: true })
  production_delay_days!: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  deposit_percentage!: number | null;

  // Champs spécifiques au type (équipements, menus, matériaux...)
  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (v: string[] | null): string | null => (v?.length ? JSON.stringify(v) : null),
      from: (v: string | null): string[] | null => {
        if (!v) return null;
        // New format: JSON array string
        if (v.trimStart().startsWith('[')) {
          try { return JSON.parse(v); } catch { return null; }
        }
        // Legacy simple-array format: raw string (single image or comma-joined)
        // Recover single image by returning the raw value as-is
        if (v.startsWith('data:') || v.startsWith('http')) return [v];
        return null;
      },
    },
  })
  images!: string[] | null;

  @Column({ type: 'text', nullable: true })
  inclusions!: string | null;

  @Column({ type: 'varchar', nullable: true })
  region!: string | null;

  @Column({ type: 'varchar', nullable: true })
  meeting_point!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  meeting_lat!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  meeting_lng!: number | null;

  @Column({ type: 'int', nullable: true })
  min_group_size!: number | null;

  @Column({ type: 'int', nullable: true })
  max_group_size!: number | null;

  @Column({ type: 'int', nullable: true })
  min_age!: number | null;

  @Column({ type: 'text', nullable: true })
  cancellation_policy!: string | null;

  @Column({ type: 'int', nullable: true })
  sustainability_score!: number | null;

  // Lien vers l'organisation qui publie l'offre
  @Column({ type: 'uuid', nullable: true })
  organization_id!: string | null;

  // Lien optionnel vers la ProviderActivity source (pour pré-remplissage et contraintes)
  @Column({ type: 'uuid', nullable: true })
  activity_id!: string | null;

  // Sous-types multiples : ['dortoir', 'suite'] — remplace offer_subtype pour les offres multi
  @Column({ type: 'jsonb', nullable: true })
  offer_subtypes!: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  tags!: string[] | null;

  // 'single' | 'variant' (voyageur choisit) | 'package' (tout inclus)
  @Column({ type: 'varchar', default: 'single' })
  offer_mode!: string;

  // 'period' | 'weekly' | 'specific' | 'always'
  @Column({ type: 'varchar', default: 'period' })
  availability_mode!: string;

  @Column({ type: 'date' })
  availability_start!: Date;

  @Column({ type: 'date' })
  availability_end!: Date;

  // pending = en attente de validation / approved = visible publiquement / rejected = refusé
  @Column({ type: 'varchar', default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}