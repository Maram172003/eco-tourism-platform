import { IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsUUID()
  activity_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  offer_type?: string;

  @IsOptional()
  @IsString()
  offer_subtype?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offer_subtypes?: string[];

  @IsOptional()
  @IsString()
  offer_mode?: string;

  @IsOptional()
  @IsString()
  availability_mode?: string;

  @IsOptional()
  @IsDateString()
  availability_start?: string;

  @IsOptional()
  @IsDateString()
  availability_end?: string;

  @IsOptional()
  @IsString()
  fulfillment_mode?: string;

  @IsOptional()
  @IsString()
  confirmation_mode?: string;

  @IsOptional()
  @IsString()
  price_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  booking_deadline_hours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  confirmation_deadline_hours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  production_delay_days?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  deposit_percentage?: number;

  @IsOptional()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  inclusions?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  meeting_point?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  meeting_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  meeting_lng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  min_group_size?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_group_size?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_age?: number;

  @IsOptional()
  @IsString()
  cancellation_policy?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class OfferSustainabilityDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsUUID()
  activity_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  offer_type?: string;

  @IsOptional()
  @IsString()
  offer_subtype?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offer_subtypes?: string[];

  @IsOptional()
  @IsString()
  offer_mode?: string;

  @IsOptional()
  @IsString()
  availability_mode?: string;

  @IsOptional()
  @IsDateString()
  availability_start?: string;

  @IsOptional()
  @IsDateString()
  availability_end?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  inclusions?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  meeting_point?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  meeting_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  meeting_lng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  min_group_size?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  max_group_size?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_age?: number;

  @IsOptional()
  @IsString()
  cancellation_policy?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  confirmation_mode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  confirmation_deadline_hours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  deposit_percentage?: number;

  @IsOptional()
  @IsString()
  langue_offre?: string;

  @IsOptional()
  details?: Record<string, unknown>;
}
