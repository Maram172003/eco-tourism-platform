// ─── questionnaires ───────────────────────────────────────────────────────────
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('questionnaires')
export class Questionnaire {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: ['eco_traveler', 'guide', 'eco_project', 'provider'] })
  target_type!: string;

  @Column({ default: 1 })
  version!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ default: 0 })
  max_score!: number;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Question, (q) => q.questionnaire)
  questions!: Question[];
}

// ─── question_categories ──────────────────────────────────────────────────────
@Entity('question_categories')
export class QuestionCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // environmental | social | economic

  @OneToMany(() => Question, (q) => q.category)
  questions!: Question[];
}

// ─── questions ────────────────────────────────────────────────────────────────
@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Questionnaire, (q) => q.questions)
  @JoinColumn({ name: 'questionnaire_id' })
  questionnaire!: Questionnaire;

  @Column()
  questionnaire_id!: string;

  @ManyToOne(() => QuestionCategory, (c) => c.questions)
  @JoinColumn({ name: 'category_id' })
  category!: QuestionCategory;

  @Column()
  category_id!: number;

  @Column({ type: 'text' })
  question_text!: string;

  @Column({ default: 1 })
  weight!: number;

  @Column({ default: 0 })
  question_order!: number;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Answer, (a) => a.question)
  answers!: Answer[];
}

// ─── answers ──────────────────────────────────────────────────────────────────
@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Question, (q) => q.answers)
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column()
  question_id!: string;

  @Column({ type: 'text' })
  answer_text!: string;

  @Column({ type: 'int' })
  score!: number; // 1 to 4

  @Column({ default: 0 })
  answer_order!: number;
}

// ─── questionnaire_attempts ───────────────────────────────────────────────────
@Entity('questionnaire_attempts')
export class QuestionnaireAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  questionnaire_id!: string;

  @Column({ type: 'int', default: 0 })
  score_total!: number;

  @Column({ type: 'int', default: 0 })
  score_percentage!: number;

  @Column({ type: 'int', default: 0 })
  environmental_score!: number;

  @Column({ type: 'int', default: 0 })
  social_score!: number;

  @Column({ type: 'int', default: 0 })
  economic_score!: number;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date | null;

  @OneToMany(() => UserAnswer, (ua) => ua.attempt)
  user_answers!: UserAnswer[];
}

// ─── user_answers ─────────────────────────────────────────────────────────────
@Entity('user_answers')
export class UserAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => QuestionnaireAttempt, (a) => a.user_answers)
  @JoinColumn({ name: 'attempt_id' })
  attempt!: QuestionnaireAttempt;

  @Column()
  attempt_id!: string;

  @Column()
  question_id!: string;

  @Column()
  answer_id!: string;

  @Column({ type: 'int' })
  score!: number;
}