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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
