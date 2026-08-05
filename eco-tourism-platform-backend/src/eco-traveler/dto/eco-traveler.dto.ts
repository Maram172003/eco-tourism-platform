import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CompleteProfileDto {
  @ApiProperty({ example: 'Maram mejri' })
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @ApiProperty({ example: 'Passionnée de voyages durables et de nature.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: 'TN' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'fr' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  cover_photo?: string;
}

export class UpdateTravelerTypesDto {
  @ApiProperty({ example: ['solo', 'explorer'] })
  @IsArray()
  @IsString({ each: true })
  traveler_types!: string[];
}

export class UpdateMotivationsDto {
  @ApiProperty({ example: ['nature', 'adventure'] })
  @IsArray()
  @IsString({ each: true })
  motivations!: string[];

  @ApiProperty({ example: ['protect_biodiversity', 'support_local_economy'] })
  @IsArray()
  @IsString({ each: true })
  sustainability_values!: string[];
}

export class UpdateInterestsDto {
  @ApiProperty({ example: ['randonnee_pedestre', 'kayak_canoe'] })
  @IsArray()
  @IsString({ each: true })
  interests!: string[];

  @ApiProperty({ example: ['mountain', 'forest', 'oasis'] })
  @IsArray()
  @IsString({ each: true })
  landscapes!: string[];

  @ApiProperty({ example: ['eco_tourism', 'slow_tourism'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  travel_styles?: string[];
}

export class UpdateGoalsDto {
  @ApiProperty({ example: ['reduce_carbon', 'support_local_projects'] })
  @IsArray()
  @IsString({ each: true })
  sustainability_goals!: string[];
}