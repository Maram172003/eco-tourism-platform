import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** La part d'un invité, en répartition personnalisée. */
export class PartInviteDto {
  /** Invité inscrit sur la plateforme. */
  @IsOptional()
  @IsUUID()
  user_id?: string;

  /** Invité contacté par courriel seul. */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class CreateReservationDto {
  @IsOptional()
  @IsUUID()
  offer_id?: string;

  @IsOptional()
  @IsUUID()
  circuit_id?: string;

  @IsOptional()
  @IsUUID()
  session_id?: string;

  /** Obligatoire sauf si session_id (la date de séance sera utilisée). */
  @IsOptional()
  @IsDateString()
  reservation_date?: string;

  @IsEnum(['solo', 'group'])
  reservation_type!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  participant_count!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  invited_user_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  invited_emails?: string[];

  /**
   * Qui paie quoi, pour une réservation de groupe.
   * organizer : l'organisateur règle tout — equal : parts égales —
   * custom : montants fixés un à un. Absent, on divise à parts égales.
   */
  @IsOptional()
  @IsEnum(['organizer', 'equal', 'custom'])
  payment_split?: string;

  /** Part de l'organisateur, en répartition personnalisée. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  organizer_share?: number;

  /** Part de chaque invité, en répartition personnalisée. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartInviteDto)
  custom_shares?: PartInviteDto[];

  /** Variant: one or more option keys (offer subtypes or circuit bookable_options). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chosen_subtypes?: string[];

  /** @deprecated use chosen_subtypes */
  @IsOptional()
  @IsString()
  chosen_subtype?: string;
}

export class RespondToInvitationDto {
  @IsEnum(['accepted', 'declined'])
  status!: string;
}

export class ConfirmReservationDto {
  @IsEnum(['confirmed', 'rejected'])
  status!: string;

  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}

export class AvailabilityQueryDto {
  @IsOptional()
  @IsUUID()
  offer_id?: string;

  @IsOptional()
  @IsUUID()
  circuit_id?: string;

  @IsOptional()
  @IsUUID()
  session_id?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

/**
 * Modification d'une réservation par son organisateur.
 *
 * Tant que le prestataire n'a pas confirmé, rien n'est engagé : l'organisateur
 * peut encore changer sa date, sa formule, son groupe et la répartition du
 * paiement. Tous les champs sont facultatifs — seuls ceux transmis changent.
 */
export class UpdateReservationDto {
  @IsOptional()
  @IsDateString()
  reservation_date?: string;

  @IsOptional()
  @IsUUID()
  session_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chosen_subtypes?: string[];

  /** Liste complète des invités après modification, pas un ajout. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  invited_user_ids?: string[];

  /** Nombre de participants, pour une réservation solo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  participant_count?: number;

  @IsOptional()
  @IsEnum(['organizer', 'equal', 'custom'])
  payment_split?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  organizer_share?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartInviteDto)
  custom_shares?: PartInviteDto[];
}
