import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Types : 'specific' = dates individuelles, 'range' = plage de dates, 'recurring' = jours répétés chaque semaine
@Entity('guide_availability_slots')
export class GuideAvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  guide_id!: string;

  @Column({ type: 'varchar' })
  type!: string;

  // ISO dates YYYY-MM-DD séparées par virgule (type 'specific')
  @Column({ type: 'simple-array', nullable: true })
  dates!: string[] | null;

  // Borne de début pour le type 'range'
  @Column({ type: 'date', nullable: true })
  start_date!: string | null;

  // Borne de fin pour le type 'range'
  @Column({ type: 'date', nullable: true })
  end_date!: string | null;

  // Jours de la semaine 0=Lun … 6=Dim (type 'recurring'), stockés en strings via simple-array
  @Column({ type: 'simple-array', nullable: true })
  days_of_week!: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  label!: string | null;

  // Horaires par jour : clé = date ISO (specific / recurring borné) ou indice jour "0"…"6" (range/recurring ouvert)
  // Valeur = tableau de { start: "HH:MM", end: "HH:MM" } — plusieurs plages possibles par jour (ex: pause déjeuner)
  @Column({ type: 'simple-json', nullable: true })
  time_slots!: Record<string, { start: string; end: string }[]> | null;

  @CreateDateColumn()
  created_at!: Date;
}
