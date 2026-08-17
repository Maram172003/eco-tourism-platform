import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @IsUUID()
  offer_id!: string;

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

  /** Variant: one or more keys from offer_subtypes / subtypes_pricing. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chosen_subtypes?: string[];

  /** @deprecated use chosen_subtypes — kept for backward compatibility */
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
  @IsUUID()
  offer_id!: string;

  @IsOptional()
  @IsUUID()
  session_id?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
