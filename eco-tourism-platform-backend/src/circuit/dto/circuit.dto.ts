import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCircuitDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  nb_jours!: number;

  @IsOptional()
  @IsString()
  cover_image?: string;

  @IsOptional()
  @IsArray()
  etapes?: object[];

  @IsOptional()
  availability?: object;

  @IsOptional()
  hebergement?: object;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateCircuitDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  nb_jours?: number;

  @IsOptional()
  @IsString()
  cover_image?: string;

  @IsOptional()
  @IsArray()
  etapes?: object[];

  @IsOptional()
  availability?: object;

  @IsOptional()
  hebergement?: object;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CircuitSustainabilityDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}
