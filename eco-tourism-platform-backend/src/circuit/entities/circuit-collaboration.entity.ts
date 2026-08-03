import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('circuit_collaborations')
export class CircuitCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  circuit_id!: string;

  // ID de l'étape (circuit.etapes[].id) — null si hébergement global (jour = -1)
  @Column({ type: 'varchar', nullable: true })
  etape_id!: string | null;

  // Prestataire propriétaire du circuit
  @Column('uuid')
  owner_id!: string;

  // Personne invitée
  @Column('uuid')
  invited_user_id!: string;

  // 'guide' | 'provider'
  @Column({ type: 'varchar' })
  invited_user_type!: string;

  @Column({ type: 'varchar' })
  invited_user_name!: string;

  // = étape.categorie ou 'hebergement'
  @Column({ type: 'varchar' })
  section!: string;

  // 'pending' | 'accepted' | 'completed' | 'declined'
  @Column({ type: 'varchar', default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  contribution_data!: Record<string, any> | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
