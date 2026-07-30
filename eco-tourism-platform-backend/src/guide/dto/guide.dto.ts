import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString,
  Min, Max, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CertificationDto {
  @IsString()
  label!: string;

  @IsString()
  @IsOptional()
  proof?: string;
}

export class CompleteGuideProfileDto {
  @ApiProperty({ example: 'Ahmed Ben Ali' })
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @ApiProperty({ example: 'local', enum: ['local', 'professionnel'] })
  @IsOptional()
  @IsString()
  guide_type?: string;

  @ApiProperty({ example: 'Guide spécialisé en écotourisme dans le sud tunisien.' })
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

  @ApiProperty({ example: 'Sahara, Djerba' })
  @IsOptional()
  @IsString()
  zone?: string;
}

export class UpdateGuideSpecialtiesDto {
  @ApiProperty({ example: ['randonnée', 'ornithologie', 'photographie'] })
  @IsArray()
  @IsString({ each: true })
  specialties!: string[];

  @ApiProperty({ example: ['fr', 'en', 'ar'] })
  @IsArray()
  @IsString({ each: true })
  languages_spoken!: string[];
}

export class UpdateGuideExperienceDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Max(50)
  years_experience!: number;

  @ApiProperty({ example: ['montagne', 'désert', 'forêt'] })
  @IsArray()
  @IsString({ each: true })
  landscapes!: string[];

  @ApiProperty({ example: [{ label: 'Guide certifié Éco-Voyage', proof: 'https://...' }] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications!: CertificationDto[];
}

// ── Nouveaux DTOs onboarding 3 étapes ─────────────────────────────────────────

export class UpdateGuideIdentityDto {
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsArray()
  @IsString({ each: true })
  languages_spoken!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  years_experience?: number;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  ville_residence?: string;

  @IsOptional()
  @IsString()
  experience_pro?: string;

  @IsOptional()
  @IsString()
  centres_interet?: string;

  @IsOptional()
  @IsString()
  pourquoi_moi?: string;
}

export class AssuranceProDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  proof?: string;
}

export class UpdateGuideCertificationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications!: CertificationDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AssuranceProDto)
  assurance?: AssuranceProDto | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domaines?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertises?: string[];
}

export class UpdateGuideServicesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types_guidage?: string[];

  @IsArray()
  @IsString({ each: true })
  zones_couvertes!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  villes_couvertes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sites_maitrises?: string[];

  @IsOptional()
  @IsBoolean()
  deplacement_possible?: boolean;

  @IsArray()
  @IsString({ each: true })
  publics_accueillis!: string[];
}

// ── Disponibilités Guide ──────────────────────────────────────────────────────

export class SaveAvailabilitySlotDto {
  @IsString()
  @IsNotEmpty()
  type!: string; // 'specific' | 'range' | 'recurring'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dates?: string[];

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days_of_week?: string[];

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  time_slots?: Record<string, { start: string; end: string }[]> | null;
}

// ── Offre Guide ───────────────────────────────────────────────────────────────

// DTO pour la sauvegarde de brouillon — tous les champs sont optionnels
export class SaveOfferDraftDto {
  @IsOptional() @IsString() titre?: string;
  @IsOptional() @IsString() description_courte?: string;
  @IsOptional() @IsString() description_longue?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
  @IsOptional() @IsString() type_prestation?: string;
  @IsOptional() @IsString() type_guidage_offre?: string;
  @IsOptional() @IsString() zone_offre?: string;
  @IsOptional() @IsString() lieu_precis?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) langue_guidage?: string[];
  @IsOptional() @IsString() duree?: string;
  @IsOptional() @IsString() point_rendez_vous?: string;
  @IsOptional() @IsString() heure_depart?: string;
  @IsOptional() @IsString() difficulte_physique?: string;
  @IsOptional() @IsString() public_cible_offre?: string;
  @IsOptional() @IsInt() @Min(1) nb_participants_max?: number;
  @IsOptional() @IsString() restrictions_medicales?: string;
  @IsOptional() @IsString() equipement_a_apporter?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) inclus_resume?: string[];
  @IsOptional() @IsString() type_disponibilite?: string;
  @IsOptional() @IsString() mode_tarification?: string;
  @IsOptional() @IsString() type_confirmation?: string;
  @IsOptional() @IsString() politique_annulation?: string;
  @IsOptional() details?: Record<string, any>;
  @IsOptional() @IsString() draft_offer_id?: string;
}

export class CreateGuideOfferDto {
  // Bloc 1
  @IsString() @IsNotEmpty() titre!: string;
  @IsString() @IsNotEmpty() description_courte!: string;
  @IsString() @IsNotEmpty() description_longue!: string;
  @IsArray() @IsString({ each: true }) photos!: string[];

  // Bloc 2 (cross-validés côté service)
  @IsString() @IsNotEmpty() type_prestation!: string;
  @IsString() @IsNotEmpty() type_guidage_offre!: string;
  @IsOptional() @IsString() zone_offre?: string;
  @IsString() @IsNotEmpty() lieu_precis!: string;
  @IsArray() @IsString({ each: true }) langue_guidage!: string[];

  // Bloc 3
  @IsOptional() @IsString() duree?: string;
  @IsString() @IsNotEmpty() point_rendez_vous!: string;
  @IsString() @IsNotEmpty() heure_depart!: string;
  @IsOptional() @IsString() difficulte_physique?: string;

  // Bloc 9
  @IsString() @IsNotEmpty() public_cible_offre!: string;
  @IsInt() @Min(1) nb_participants_max!: number;
  @IsString() @IsNotEmpty() restrictions_medicales!: string;
  @IsString() @IsNotEmpty() equipement_a_apporter!: string;

  // Bloc 10
  @IsArray() @IsString({ each: true }) inclus_resume!: string[];

  // Bloc 11
  @IsString() @IsNotEmpty() type_disponibilite!: string;

  // Bloc 12
  @IsString() @IsNotEmpty() mode_tarification!: string;

  // Bloc 13
  @IsString() @IsNotEmpty() type_confirmation!: string;
  @IsString() @IsNotEmpty() politique_annulation!: string;

  // Tout le reste (programme, transport, repas, hébergement, équipement, tarifs…)
  @IsOptional()
  details?: Record<string, any>;

  // Flag interne — indique que l'offre est finalisée (mise à jour du statut)
  @IsOptional() @IsBoolean()
  _finalize?: boolean;
}
