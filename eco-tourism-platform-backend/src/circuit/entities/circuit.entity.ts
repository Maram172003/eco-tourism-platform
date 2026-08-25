import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('circuits')
export class Circuit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  provider_id!: string;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 1 })
  nb_jours!: number;

  @Column({ type: 'varchar', nullable: true })
  cover_image!: string | null;

  @Column({ type: 'jsonb', default: [] })
  etapes!: object[];

  @Column({ type: 'jsonb', nullable: true })
  availability!: object | null;

  @Column({ type: 'jsonb', nullable: true })
  hebergement!: object | null;

  @Column({ type: 'varchar', default: 'draft' })
  status!: string;

  @Column({ type: 'varchar', default: 'provider' })
  owner_type!: string;

  @Column({ type: 'jsonb', nullable: true })
  tags!: string[] | null;

  // Score d'écoresponsabilité du circuit (0-100), issu du questionnaire dédié.
  @Column({ type: 'int', nullable: true })
  sustainability_score!: number | null;

  /** single | variant | package — how travelers pick bookable blocks */
  @Column({ type: 'varchar', default: 'single' })
  circuit_mode!: string;

  /** Cached list of reservable blocks (rebuilt from etapes + collabs) */
  @Column({ type: 'jsonb', nullable: true })
  bookable_options!: object[] | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number | null;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ type: 'int', nullable: true })
  min_group_size!: number | null;

  @Column({ type: 'int', nullable: true })
  max_group_size!: number | null;

  @Column({ type: 'varchar', default: 'manual' })
  confirmation_mode!: string;

  @Column({ type: 'int', default: 0 })
  deposit_percentage!: number;

  @Column({ type: 'int', nullable: true })
  booking_deadline_hours!: number | null;

  @Column({ type: 'text', nullable: true })
  cancellation_policy!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
