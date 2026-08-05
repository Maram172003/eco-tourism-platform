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

@Entity('eco_travelers')
export class EcoTraveler {
  @PrimaryColumn('uuid')
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar' })
  full_name!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', nullable: true })
  language!: string | null;

  @Column({ type: 'varchar', nullable: true })
  photo!: string | null;

  @Column({ type: 'text', nullable: true })
  cover_photo!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  traveler_types!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  motivations!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  sustainability_values!: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  interests!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  landscapes!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  travel_styles!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  sustainability_goals!: string[] | null;

  @Column({ type: 'int', default: 0 })
  profile_completion!: number;

  @Column({ type: 'boolean', default: false })
  is_onboarded!: boolean;

  @Column({ type: 'int', nullable: true })
  sustainability_score!: number | null;
 
  
  @Column({ type: 'int', nullable: true })
  score_questionnaire!: number | null;  // 20% — score brut du QCM (0-100)
 
  @Column({ type: 'int', default: 0 })
  score_reservations!: number;          // 40% — rempli au Sprint 4
 
  @Column({ type: 'int', default: 0 })
  score_feedbacks!: number;             // 20% — rempli au Sprint 8
 
  @Column({ type: 'int', default: 0 })
  score_partages!: number;              // 20% — rempli au Sprint 7
 
  @CreateDateColumn()
  created_at!: Date;
 
  @UpdateDateColumn()
  updated_at!: Date;
}