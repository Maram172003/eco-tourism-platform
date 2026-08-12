import { IsArray, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PersonalCertificationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() document_url?: string;
}

export class UpdateProviderDto {
  // ── Identité personnelle ──
  @IsOptional() @IsString() full_name?: string;
  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() personal_bio?: string;
  @IsOptional() @IsArray() languages_spoken?: string[];
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) years_experience?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PersonalCertificationDto)
  personal_certifications?: PersonalCertificationDto[];
  // ── Organisation (temporaire — migrera vers organizations) ──
  @IsOptional() @IsString() provider_type?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() history?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() cover_photo?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zone?: string;
  // Coordonnées du point de vente : le formulaire de profil les envoie, elles
  // étaient absentes du DTO et la requête entière partait en 400.
  @IsOptional() @IsNumber() @Type(() => Number) lat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) lng?: number;
  @IsOptional() @IsString() opening_hours?: string;
  @IsOptional() @IsArray() activity_types?: string[];
  @IsOptional() @IsArray() secondary_activity_types?: string[];
  @IsOptional() @IsArray() specialties?: string[];
  @IsOptional() @IsArray() services?: string[];
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsArray() videos?: string[];
  @IsOptional() @IsArray() eco_labels?: string[];
}

export class OnboardingProviderDto {
  // ── Identité personnelle ──
  @IsString() full_name!: string;
  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() personal_bio?: string;
  @IsOptional() @IsArray() languages_spoken?: string[];
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) years_experience?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PersonalCertificationDto)
  personal_certifications?: PersonalCertificationDto[];
  // ── Organisation ──
  @IsString() provider_type!: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() history?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() cover_photo?: string;
  // ── Contact ──
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  // ── Localisation ──
  @IsString() region!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() zone?: string;
  // ── Activités ──
  @IsOptional() @IsArray() activity_types?: string[];
  @IsOptional() @IsArray() secondary_activity_types?: string[];
  @IsOptional() @IsArray() specialties?: string[];
  @IsOptional() @IsArray() services?: string[];
  // ── Médias ──
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsArray() videos?: string[];
  // ── Labels org ──
  @IsOptional() @IsArray() eco_labels?: string[];
  @IsOptional() @IsString() opening_hours?: string;
}
