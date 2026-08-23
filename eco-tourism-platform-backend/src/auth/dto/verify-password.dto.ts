import { IsString } from 'class-validator';

/** Première étape du changement de mot de passe : on ne valide que l'actuel. */
export class VerifyPasswordDto {
  @IsString()
  current_password!: string;
}
