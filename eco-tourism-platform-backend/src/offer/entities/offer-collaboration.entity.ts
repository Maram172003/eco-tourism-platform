import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('offer_collaborations')
export class OfferCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Offre brouillon concernée
  @Column('uuid')
  offer_id!: string;

  // Guide créateur de l'offre
  @Column('uuid')
  guide_id!: string;

  // Personne invitée
  @Column('uuid')
  invited_user_id!: string;

  // 'guide' | 'provider'
  @Column({ type: 'varchar' })
  invited_user_type!: string;

  @Column({ type: 'varchar' })
  invited_user_name!: string;

  // 'transport' | 'restauration' | 'hebergement'
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
}
