import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Partage d'une publication.
 *
 * Le bouton « Partager » se contentait de copier le lien dans le presse-papier :
 * rien n'était enregistré, et le nombre de partages ne pouvait donc pas exister.
 * Cette table le rend mesurable.
 *
 * Contrairement aux « j'aime », un même compte peut partager plusieurs fois —
 * il n'y a donc pas de contrainte d'unicité : chaque partage est un événement.
 */
@Entity('publication_shares')
export class PublicationShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  publication_id!: string;

  /** Nul si le partage vient d'un visiteur non connecté. */
  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
